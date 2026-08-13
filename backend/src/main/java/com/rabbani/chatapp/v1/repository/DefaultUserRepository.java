package com.rabbani.chatapp.v1.repository;

import com.rabbani.chatapp.v1.entity.UserEntity;
import com.rabbani.chatapp.v1.entity.query.UserAuthQuery;
import com.rabbani.chatapp.v1.repository.delegator.UserRepositoryDelegator;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigInteger;
import java.util.Optional;

@Component
@AllArgsConstructor
public class DefaultUserRepository implements UserRepository {

    private final UserRepositoryDelegator userRepositoryDelegator;

    @Override
    public boolean existsByEmailIgnoreCase(String email) {
        return userRepositoryDelegator.existsByEmailIgnoreCase(email);
    }

    @Override
    public Optional<UserAuthQuery> findByEmail(String email) {
        return userRepositoryDelegator.queryAuthByEmail(email);
    }

    @Override
    public Optional<UserAuthQuery> findById(BigInteger id) {
        return userRepositoryDelegator.queryAuthById(id);
    }

    @Override
    public Optional<UserEntity> findEntityByEmail(String email) {
        return userRepositoryDelegator.findByEmailIgnoreCase(email);
    }

    @Override
    public UserEntity save(UserEntity user) {
        return userRepositoryDelegator.save(user);
    }

}
