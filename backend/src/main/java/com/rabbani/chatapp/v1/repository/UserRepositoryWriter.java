package com.rabbani.chatapp.v1.repository;

import com.rabbani.chatapp.v1.entity.UserEntity;

public interface UserRepositoryWriter {

    UserEntity save(UserEntity user);
}
