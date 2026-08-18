package com.rabbani.chatapp.v1.repository;

import com.rabbani.chatapp.v1.entity.ConversationEntity;
import com.rabbani.chatapp.v1.entity.ConversationMessageEntity;
import com.rabbani.chatapp.v1.entity.UserConversationEntity;
import com.rabbani.chatapp.v1.entity.query.ConversationMessageQuery;
import com.rabbani.chatapp.v1.entity.query.ConversationSummaryQuery;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
@AllArgsConstructor
public class DefaultConversationRepository implements ConversationRepository {

    private final ConversationRepositoryDelegator conversationRepositoryDelegator;

    private final UserConversationRepositoryDelegator userConversationRepositoryDelegator;

    private final ConversationMessageRepositoryDelegator conversationMessageRepositoryDelegator;

    @Override
    public Optional<ConversationEntity> findDirectMessage(Long currentUserId, Long otherUserId) {
        return conversationRepositoryDelegator.findDirectMessage(currentUserId, otherUserId);
    }

    @Override
    public Optional<ConversationEntity> findBySignature(String signature) {
        return conversationRepositoryDelegator.findBySignature(signature);
    }

    @Override
    public Optional<UserConversationEntity> findUserConversation(Long userId, Long conversationId) {
        return userConversationRepositoryDelegator.findByUserIdAndConversationId(userId, conversationId);
    }

    @Override
    public Page<ConversationSummaryQuery> findConversations(Long userId, Pageable pageable) {
        return conversationRepositoryDelegator.findConversations(userId, pageable);
    }

    @Override
    public Page<ConversationMessageQuery> findMessages(Long conversationId, Long currentUserId, Pageable pageable) {
        return conversationMessageRepositoryDelegator.findMessages(conversationId, currentUserId, pageable);
    }
}
