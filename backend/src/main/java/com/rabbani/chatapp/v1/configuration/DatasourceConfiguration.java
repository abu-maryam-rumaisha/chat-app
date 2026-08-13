package com.rabbani.chatapp.v1.configuration;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.rabbani.chatapp.v1.util.UserSession;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisOperations;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.RedisSerializer;
import org.springframework.data.redis.serializer.SerializationException;

import java.io.IOException;

@Configuration
public class DatasourceConfiguration {

    @Bean
    public RedisOperations<String, UserSession.RedisUserSession> redisUserSessionRedisOperations(
            RedisConnectionFactory redisConnectionFactory,
            JsonMapper jsonMapper) {
        RedisTemplate<String, UserSession.RedisUserSession> redisTemplate = new RedisTemplate<>();
        redisTemplate.setConnectionFactory(redisConnectionFactory);
        redisTemplate.setKeySerializer(RedisSerializer.string());
        redisTemplate.setValueSerializer(new RedisSerializer<UserSession.RedisUserSession>() {
            @Override
            public byte[] serialize(UserSession.RedisUserSession value) throws SerializationException {
                try {
                    if (value == null) {
                        return new byte[0];
                    }
                    return jsonMapper.writeValueAsBytes(value);
                } catch (JsonProcessingException e) {
                    throw new SerializationException("Cannot process serializer", e);
                }
            }

            @Override
            public UserSession.RedisUserSession deserialize(byte[] bytes) throws SerializationException {
                try {
                    if (bytes == null || bytes.length == 0) {
                        return null;
                    }
                    return jsonMapper.readValue(bytes, UserSession.RedisUserSession.class);
                } catch (IOException e) {
                    throw new RuntimeException(e);
                }
            }
        });
        return redisTemplate;
    }
}
