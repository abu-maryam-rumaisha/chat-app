package com.rabbani.chatapp.v1.repository;

import com.rabbani.chatapp.v1.entity.UserConversationEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserConversationRepositoryDelegator extends JpaRepository<UserConversationEntity, Long> {

    Optional<UserConversationEntity> findByUserIdAndConversationId(Long userId, Long conversationId);
}
