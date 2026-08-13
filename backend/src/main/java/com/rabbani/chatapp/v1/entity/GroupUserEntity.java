package com.rabbani.chatapp.v1.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Entity(name = "group_users")
public class GroupUserEntity extends AuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "group_id")
    private Long groupId;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "joined_at")
    private LocalDateTime joinedAt;

    @Column(name = "is_admin")
    private boolean isAdmin;

}
