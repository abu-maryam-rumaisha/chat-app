package com.rabbani.chatapp.v1.repository;

import com.rabbani.chatapp.v1.entity.UserEntity;
import com.rabbani.chatapp.v1.entity.query.UserAuthQuery;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
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

    @Query("""
            select u from users u
            where u.id <> :userId
              and u.status = com.rabbani.chatapp.v1.entity.UserStatus.active
              and (:search = ''
                   or lower(u.firstName) like lower(concat('%', :search, '%'))
                   or lower(u.lastName) like lower(concat('%', :search, '%'))
                   or lower(u.email) like lower(concat('%', :search, '%')))
            order by u.firstName asc, u.lastName asc, u.id asc
            """)
    Page<UserEntity> searchContacts(@Param("userId") BigInteger userId, @Param("search") String search, Pageable pageable);
}
