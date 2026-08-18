package com.rabbani.chatapp.v1.service;

import com.rabbani.chatapp.v1.dto.ConversationControllerDto;
import com.rabbani.chatapp.v1.dto.Response;

import java.math.BigInteger;

public interface ConversationService {

    Response<ConversationControllerDto.GetConversationsResponse> getConversations(int page, int size);

    Response<ConversationControllerDto.GetConversationMessagesResponse> getMessages(Long conversationId, int page, int size);

    Response<ConversationControllerDto.CreateDirectMessageResponse> findDirectMessage(BigInteger otherUserId);

    Response<ConversationControllerDto.CreateDirectMessageResponse> postDirectMessage(ConversationControllerDto.CreateDirectMessageRequest requestPayload);

    void sendTyping(Long senderId, ConversationControllerDto.TypingRequest requestPayload);
}
