package com.rabbani.chatapp.v1.service.impl;

import com.rabbani.chatapp.v1.dto.ConversationControllerDto;
import com.rabbani.chatapp.v1.dto.Response;
import com.rabbani.chatapp.v1.entity.ConversationEntity;
import com.rabbani.chatapp.v1.entity.ConversationMessageEntity;
import com.rabbani.chatapp.v1.entity.UserConversationEntity;
import com.rabbani.chatapp.v1.entity.query.ConversationMessageQuery;
import com.rabbani.chatapp.v1.entity.query.ConversationSummaryQuery;
import com.rabbani.chatapp.v1.repository.ConversationRepository;
import com.rabbani.chatapp.v1.repository.ConversationRepositoryWriter;
import com.rabbani.chatapp.v1.repository.UserRepository;
import com.rabbani.chatapp.v1.service.ConversationService;
import com.rabbani.chatapp.v1.service.PresenceService;
import com.rabbani.chatapp.v1.util.ConversationSignature;
import com.rabbani.chatapp.v1.util.ResponseException;
import com.rabbani.chatapp.v1.util.Session;
import com.rabbani.chatapp.v1.util.UserSession;
import lombok.AllArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.math.BigInteger;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@AllArgsConstructor
public class BasicConversationService implements ConversationService {

    private final ConversationRepository conversationRepository;

    private final ConversationRepositoryWriter conversationRepositoryWriter;

    private final UserRepository userRepository;

    private final Session session;

    private final SimpMessagingTemplate messagingTemplate;

    private final PresenceService presenceService;

    @Override
    public Response<ConversationControllerDto.GetConversationsResponse> getConversations(int page, int size) {
        UserSession userSession = session.getSession();
        Long currentUserId = userSession.getId().longValueExact();

        Page<ConversationSummaryQuery> result = conversationRepository.findConversations(currentUserId, PageRequest.of(page, size));

        List<BigInteger> otherUserIds = result.getContent().stream()
                .map(ConversationSummaryQuery::getOtherUserId)
                .collect(Collectors.toList());
        Set<BigInteger> online = presenceService.onlineAmong(otherUserIds);

        List<ConversationControllerDto.GetConversationResponse> items = result.getContent().stream()
                .map(query -> toGetConversationResponse(query, online.contains(query.getOtherUserId())))
                .collect(Collectors.toList());

        ConversationControllerDto.GetConversationsResponse response = new ConversationControllerDto.GetConversationsResponse();
        response.setItems(items);
        response.setHasMore(result.hasNext());
        return new Response<>(response);
    }

    @Override
    public Response<ConversationControllerDto.GetConversationMessagesResponse> getMessages(Long conversationId, int page, int size) {
        UserSession userSession = session.getSession();
        Long currentUserId = userSession.getId().longValueExact();

        conversationRepository.findUserConversation(currentUserId, conversationId)
                .orElseThrow(() -> new ResponseException(HttpStatus.FORBIDDEN, "Not a participant of this conversation"));

        Page<ConversationMessageQuery> result = conversationRepository.findMessages(conversationId, currentUserId, PageRequest.of(page, size));

        List<ConversationControllerDto.ConversationMessage> items = result.getContent().stream()
                .map(BasicConversationService::toConversationMessage)
                .collect(Collectors.toList());
        Collections.reverse(items);

        ConversationControllerDto.GetConversationMessagesResponse response = new ConversationControllerDto.GetConversationMessagesResponse();
        response.setItems(items);
        response.setHasMore(result.hasNext());
        return new Response<>(response);
    }

    @Override
    public Response<ConversationControllerDto.CreateDirectMessageResponse> findDirectMessage(BigInteger otherUserId) {
        UserSession userSession = session.getSession();
        Long currentUserId = userSession.getId().longValueExact();
        Long otherId = validateDirectMessageTarget(currentUserId, otherUserId);

        return conversationRepository.findDirectMessage(currentUserId, otherId)
                .map(BasicConversationService::toCreateDirectMessageResponse)
                .orElseGet(() -> new Response<>((ConversationControllerDto.CreateDirectMessageResponse) null));
    }

    @Override
    public Response<ConversationControllerDto.CreateDirectMessageResponse> postDirectMessage(ConversationControllerDto.CreateDirectMessageRequest requestPayload) {
        UserSession userSession = session.getSession();
        Long currentUserId = userSession.getId().longValueExact();
        Long otherUserId = validateDirectMessageTarget(currentUserId, requestPayload.getUserId());

        ConversationEntity conversation;
        UserConversationEntity currentUserConversation;

        ConversationEntity newConversation = new ConversationEntity();
        newConversation.setGroupId(null);
        newConversation.setSignature(ConversationSignature.generate(null, List.of(currentUserId, otherUserId)));
        newConversation.setDeleted(false);
        newConversation.setCreatedAt(LocalDateTime.now(ZoneOffset.UTC));
        newConversation.setCreatedBy(userSession.getEmail());

        try {
            ConversationRepositoryWriter.Result created = conversationRepositoryWriter.createConversationWithParticipants(newConversation, currentUserId, otherUserId);
            conversation = created.conversation();
            currentUserConversation = created.currentUserConversation();
        } catch (DataIntegrityViolationException e) {
            conversation = conversationRepository.findBySignature(newConversation.getSignature())
                    .orElseThrow(() -> new ResponseException(HttpStatus.INTERNAL_SERVER_ERROR, "Missing conversation"));
            currentUserConversation = conversationRepository.findUserConversation(currentUserId, conversation.getId())
                    .orElseThrow(() -> new ResponseException(HttpStatus.INTERNAL_SERVER_ERROR, "Missing user conversation"));
        }

        ConversationMessageEntity savedMessage = saveMessage(conversation, currentUserConversation, requestPayload.getMessage(), userSession.getEmail());
        broadcastMessage(conversation.getId(), savedMessage, currentUserId, otherUserId);

        return toCreateDirectMessageResponse(conversation);
    }

    private ConversationMessageEntity saveMessage(ConversationEntity conversation, UserConversationEntity userConversation, String message, String createdBy) {
        ConversationMessageEntity conversationMessage = new ConversationMessageEntity();
        conversationMessage.setConversationId(conversation.getId());
        conversationMessage.setUserConversationId(userConversation.getId());
        conversationMessage.setMessage(message);
        conversationMessage.setRecordAt(LocalDateTime.now(ZoneOffset.UTC));
        conversationMessage.setCreatedAt(LocalDateTime.now(ZoneOffset.UTC));
        conversationMessage.setCreatedBy(createdBy);
        return conversationRepositoryWriter.saveMessage(conversationMessage);
    }

    private void broadcastMessage(Long conversationId, ConversationMessageEntity savedMessage, Long senderId, Long recipientId) {
        ConversationControllerDto.ConversationMessageEvent forSender = toConversationMessageEvent(conversationId, savedMessage, true, recipientId);
        ConversationControllerDto.ConversationMessageEvent forRecipient = toConversationMessageEvent(conversationId, savedMessage, false, senderId);

        messagingTemplate.convertAndSendToUser(senderId.toString(), "/queue/conversations", forSender);
        messagingTemplate.convertAndSendToUser(recipientId.toString(), "/queue/conversations", forRecipient);
    }

    private static ConversationControllerDto.ConversationMessageEvent toConversationMessageEvent(Long conversationId, ConversationMessageEntity message, boolean outgoing, Long otherUserId) {
        ConversationControllerDto.ConversationMessageEvent event = new ConversationControllerDto.ConversationMessageEvent();
        event.setConversationId(conversationId);
        event.setId(message.getId());
        event.setMessage(message.getMessage());
        event.setOutgoing(outgoing);
        event.setRecordAt(message.getRecordAt());
        event.setOtherUserId(BigInteger.valueOf(otherUserId));
        return event;
    }

    @Override
    public void sendTyping(Long senderId, ConversationControllerDto.TypingRequest requestPayload) {
        BigInteger otherUserId = requestPayload.getOtherUserId();
        if (otherUserId == null || otherUserId.longValueExact() == senderId) {
            return;
        }

        ConversationControllerDto.TypingEvent event = new ConversationControllerDto.TypingEvent();
        event.setUserId(BigInteger.valueOf(senderId));
        event.setTyping(requestPayload.isTyping());

        messagingTemplate.convertAndSendToUser(otherUserId.toString(), "/queue/typing", event);
    }

    private Long validateDirectMessageTarget(Long currentUserId, BigInteger otherUserId) {
        Long otherId = otherUserId.longValueExact();

        if (currentUserId.equals(otherId)) {
            throw new ResponseException(HttpStatus.BAD_REQUEST, "Cannot start a direct message with yourself");
        }

        if (userRepository.findById(otherUserId).isEmpty()) {
            throw new ResponseException(HttpStatus.NOT_FOUND, "User not found");
        }

        return otherId;
    }

    private static Response<ConversationControllerDto.CreateDirectMessageResponse> toCreateDirectMessageResponse(ConversationEntity conversation) {
        ConversationControllerDto.CreateDirectMessageResponse response = new ConversationControllerDto.CreateDirectMessageResponse();
        response.setId(conversation.getId());
        return new Response<>(response);
    }

    private static ConversationControllerDto.GetConversationResponse toGetConversationResponse(ConversationSummaryQuery query, boolean online) {
        ConversationControllerDto.Interlocutor interlocutor = new ConversationControllerDto.Interlocutor();
        interlocutor.setId(query.getOtherUserId());
        interlocutor.setFirstName(query.getOtherFirstName());
        interlocutor.setLastName(query.getOtherLastName());
        interlocutor.setEmail(query.getOtherEmail());
        interlocutor.setOnline(online);

        ConversationControllerDto.GetConversationResponse response = new ConversationControllerDto.GetConversationResponse();
        response.setId(query.getId());
        response.setInterlocutor(interlocutor);
        response.setLastMessage(query.getLastMessage());
        response.setLastMessageAt(query.getLastMessageAt());
        return response;
    }

    private static ConversationControllerDto.ConversationMessage toConversationMessage(ConversationMessageQuery query) {
        ConversationControllerDto.ConversationMessage message = new ConversationControllerDto.ConversationMessage();
        message.setId(query.getId());
        message.setMessage(query.getMessage());
        message.setOutgoing(query.isOutgoing());
        message.setRecordAt(query.getRecordAt());
        return message;
    }
}
