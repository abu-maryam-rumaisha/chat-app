package com.rabbani.chatapp.v1.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Entity(name = "conversation_messages")
public class ConversationMessageEntity extends AuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "conversation_id")
    private Long conversationId;

    @Column(name = "message")
    private String message;

    @Column(name = "user_conversation_id")
    private Long userConversationId;

    @Column(name = "record_at")
    private LocalDateTime recordAt;

//    @JdbcTypeCode(SqlTypes.ARRAY)
//    @Column(name = "red")
//    private long[] red;

}
