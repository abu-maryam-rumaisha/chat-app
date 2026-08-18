package com.rabbani.chatapp.v1.repository;

import com.rabbani.chatapp.v1.entity.UserEntity;
import com.rabbani.chatapp.v1.entity.query.UserAuthQuery;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.math.BigInteger;
import java.util.Optional;

public interface UserRepository {

    boolean existsByEmailIgnoreCase(String email);

    Optional<UserAuthQuery> findByEmail(String email);

    Optional<UserAuthQuery> findById(BigInteger id);

    Optional<UserEntity> findEntityByEmail(String email);

    Page<UserEntity> searchContacts(BigInteger userId, String search, Pageable pageable);
}
