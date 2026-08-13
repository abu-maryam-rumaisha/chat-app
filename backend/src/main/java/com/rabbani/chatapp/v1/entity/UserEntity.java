package com.rabbani.chatapp.v1.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.Data;

import java.math.BigInteger;

@Data
@Entity(name = "users")
public class UserEntity extends AuditEntity{

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private BigInteger id;

    @Column(name = "signature")
    private String signature;

    @Column(name = "email")
    private String email;

    @Column(name = "password")
    private String password;

    @Column(name = "lang")
    private String lang;

    @Column(name = "timezone")
    private String timezone;

    @Column(name = "first_name")
    private String firstName;

    @Column(name = "last_name")
    private String lastName;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private UserStatus status;

}
