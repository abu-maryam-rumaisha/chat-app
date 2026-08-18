package com.rabbani.chatapp.v1.repository;

import com.rabbani.chatapp.v1.entity.ConversationEntity;
import com.rabbani.chatapp.v1.entity.ConversationMessageEntity;
import com.rabbani.chatapp.v1.entity.UserConversationEntity;

public interface ConversationRepositoryWriter {

    Result createConversationWithParticipants(ConversationEntity conversation, Long currentUserId, Long otherUserId);

    ConversationMessageEntity saveMessage(ConversationMessageEntity message);

    record Result(ConversationEntity conversation, UserConversationEntity currentUserConversation) {
    }
}
