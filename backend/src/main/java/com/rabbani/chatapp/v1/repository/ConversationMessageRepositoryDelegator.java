package com.rabbani.chatapp.v1.repository;

import com.rabbani.chatapp.v1.entity.ConversationMessageEntity;
import com.rabbani.chatapp.v1.entity.query.ConversationMessageQuery;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ConversationMessageRepositoryDelegator extends JpaRepository<ConversationMessageEntity, Long> {

    @Query(value = """
            select cm.id                          as id,
                   cm.message                      as message,
                   cm.record_at                     as recordAt,
                   (uc.user_id = :currentUserId)    as outgoing
            from conversation_messages cm
            join user_conversations uc on uc.id = cm.user_conversation_id
            where cm.conversation_id = :conversationId
            order by cm.id desc
            """,
            countQuery = """
            select count(*) from conversation_messages where conversation_id = :conversationId
            """,
            nativeQuery = true)
    Page<ConversationMessageQuery> findMessages(@Param("conversationId") Long conversationId, @Param("currentUserId") Long currentUserId, Pageable pageable);
}
