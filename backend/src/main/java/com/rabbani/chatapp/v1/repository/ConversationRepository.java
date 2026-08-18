package com.rabbani.chatapp.v1.repository;

import com.rabbani.chatapp.v1.entity.ConversationEntity;
import com.rabbani.chatapp.v1.entity.ConversationMessageEntity;
import com.rabbani.chatapp.v1.entity.UserConversationEntity;
import com.rabbani.chatapp.v1.entity.query.ConversationMessageQuery;
import com.rabbani.chatapp.v1.entity.query.ConversationSummaryQuery;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Optional;

public interface ConversationRepository {

    Optional<ConversationEntity> findDirectMessage(Long currentUserId, Long otherUserId);

    Optional<ConversationEntity> findBySignature(String signature);

    Optional<UserConversationEntity> findUserConversation(Long userId, Long conversationId);

    Page<ConversationSummaryQuery> findConversations(Long userId, Pageable pageable);

    Page<ConversationMessageQuery> findMessages(Long conversationId, Long currentUserId, Pageable pageable);
}
