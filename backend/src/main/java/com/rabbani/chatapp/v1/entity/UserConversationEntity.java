package com.rabbani.chatapp.v1.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.Data;

@Data
@Entity(name = "user_conversations")
public class UserConversationEntity extends AuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "position")
    private int position;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "conversation_id")
    private Long conversationId;

}
