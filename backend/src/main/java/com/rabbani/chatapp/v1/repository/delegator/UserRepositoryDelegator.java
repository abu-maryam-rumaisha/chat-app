package com.rabbani.chatapp.v1.repository.delegator;

import com.rabbani.chatapp.v1.entity.UserEntity;
import com.rabbani.chatapp.v1.entity.query.UserAuthQuery;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.math.BigInteger;
import java.util.Optional;

@Repository
public interface UserRepositoryDelegator extends JpaRepository<UserEntity, BigInteger> {

    boolean existsByEmailIgnoreCase(String email);

    @Query(value ="""
            select u.id,
                   u.first_name firstName,
                   u.last_name  lastName,
                   u.password,
                   u.email,
                   u.status
            from users u
            where u.email = ?1
            limit 1
            """,nativeQuery = true)
    Optional<UserAuthQuery> queryAuthByEmail(String email);

    @Query( value = """
            select u.id,
                   u.first_name firstName,
                   u.last_name  lastName,
                   u.password,
                   u.email,
                   u.status
            from users u
            where u.id = ?1
            limit 1
            """,
            nativeQuery = true)
    Optional<UserAuthQuery> queryAuthById(BigInteger id);

    Optional<UserEntity> findByEmailIgnoreCase(String email);
}
