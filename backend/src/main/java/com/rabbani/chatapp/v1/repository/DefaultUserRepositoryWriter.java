package com.rabbani.chatapp.v1.repository;

import com.rabbani.chatapp.v1.entity.UserEntity;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@AllArgsConstructor
public class DefaultUserRepositoryWriter implements UserRepositoryWriter {

    private final UserRepositoryDelegator userRepositoryDelegator;

    @Override
    @Transactional
    public UserEntity save(UserEntity user) {
        return userRepositoryDelegator.save(user);
    }
}
