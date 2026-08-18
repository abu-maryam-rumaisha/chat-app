package com.rabbani.chatapp.v1.repository;

import com.rabbani.chatapp.v1.entity.ConversationEntity;
import com.rabbani.chatapp.v1.entity.ConversationMessageEntity;
import com.rabbani.chatapp.v1.entity.UserConversationEntity;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@AllArgsConstructor
public class DefaultConversationRepositoryWriter implements ConversationRepositoryWriter {

    private final ConversationRepositoryDelegator conversationRepositoryDelegator;

    private final UserConversationRepositoryDelegator userConversationRepositoryDelegator;

    private final ConversationMessageRepositoryDelegator conversationMessageRepositoryDelegator;

    @Override
    @Transactional
    public Result createConversationWithParticipants(ConversationEntity conversation, Long currentUserId, Long otherUserId) {
        ConversationEntity savedConversation = conversationRepositoryDelegator.save(conversation);

        UserConversationEntity currentUserConversation = saveParticipant(savedConversation, currentUserId, 0);
        saveParticipant(savedConversation, otherUserId, 1);

        return new Result(savedConversation, currentUserConversation);
    }

    @Override
    @Transactional
    public ConversationMessageEntity saveMessage(ConversationMessageEntity message) {
        return conversationMessageRepositoryDelegator.save(message);
    }

    private UserConversationEntity saveParticipant(ConversationEntity conversation, Long userId, int position) {

        UserConversationEntity userConversation = new UserConversationEntity();
        userConversation.setConversationId(conversation.getId());
        userConversation.setUserId(userId);
        userConversation.setPosition(position);
        userConversation.setCreatedAt(conversation.getCreatedAt());
        userConversation.setCreatedBy(conversation.getCreatedBy());
        return userConversationRepositoryDelegator.save(userConversation);
    }
}
