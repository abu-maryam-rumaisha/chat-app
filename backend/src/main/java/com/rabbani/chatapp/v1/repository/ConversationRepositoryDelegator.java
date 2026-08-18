package com.rabbani.chatapp.v1.repository;

import com.rabbani.chatapp.v1.entity.ConversationEntity;
import com.rabbani.chatapp.v1.entity.query.ConversationSummaryQuery;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ConversationRepositoryDelegator extends JpaRepository<ConversationEntity, Long> {

    @Query("""
            select c from conversations c
            join user_conversations uc1 on uc1.conversationId = c.id
            join user_conversations uc2 on uc2.conversationId = c.id
            where uc1.userId = :currentUserId
              and uc2.userId = :otherUserId
              and c.groupId is null
              and c.isDeleted = false
            """)
    Optional<ConversationEntity> findDirectMessage(@Param("currentUserId") Long currentUserId, @Param("otherUserId") Long otherUserId);

    Optional<ConversationEntity> findBySignature(String signature);

    @Query(value = """
            select c.id                as id,
                   ou.id                as otherUserId,
                   ou.first_name        as otherFirstName,
                   ou.last_name         as otherLastName,
                   ou.email             as otherEmail,
                   lm.message           as lastMessage,
                   lm.record_at         as lastMessageAt
            from conversations c
            join user_conversations uc on uc.conversation_id = c.id and uc.user_id = :currentUserId
            join user_conversations ouc on ouc.conversation_id = c.id and ouc.user_id <> :currentUserId
            join users ou on ou.id = ouc.user_id
            left join lateral (
                select cm.message, cm.record_at
                from conversation_messages cm
                where cm.conversation_id = c.id
                order by cm.id desc
                limit 1
            ) lm on true
            where c.group_id is null
              and c.is_deleted = false
            order by coalesce(lm.record_at, c.created_at) desc
            """,
            countQuery = """
            select count(*)
            from conversations c
            join user_conversations uc on uc.conversation_id = c.id and uc.user_id = :currentUserId
            where c.group_id is null
              and c.is_deleted = false
            """,
            nativeQuery = true)
    Page<ConversationSummaryQuery> findConversations(@Param("currentUserId") Long currentUserId, Pageable pageable);
}
