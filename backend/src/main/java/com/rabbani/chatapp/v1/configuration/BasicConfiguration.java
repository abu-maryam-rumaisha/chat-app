package com.rabbani.chatapp.v1.configuration;

import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.fasterxml.uuid.Generators;
import com.fasterxml.uuid.NoArgGenerator;
import com.rabbani.chatapp.v1.configuration.properties.ApplicationProperties;
import com.rabbani.chatapp.v1.util.CacheManager;
import com.rabbani.chatapp.v1.util.UserSession;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.client.RestClient;

import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.random.RandomGenerator;

@Configuration
@SecurityScheme(
        type = SecuritySchemeType.HTTP,
        name = "basicAuth",
        scheme = "basic")
@EnableConfigurationProperties(ApplicationProperties.class)
public class BasicConfiguration {

    @Bean
    public NoArgGenerator uuidGenerator() {
        return Generators.timeBasedEpochGenerator();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public RandomGenerator secureRandom() throws NoSuchAlgorithmException {
        return SecureRandom.getInstanceStrong();
    }

    @Bean
    public CacheManager.Cache<String, UserSession> sessionCache(ApplicationProperties applicationProperties) {
        return CacheManager.getInstance().newInstance("sessionCache", applicationProperties.getSession().getTokenTtl().toMillis());
    }

    @Bean
    JsonMapper jsonMapper() {
        return JsonMapper.builder()
                .enable(SerializationFeature.INDENT_OUTPUT)
                .build();
    }

    @Bean
    public RestClient restClient() {
        return RestClient.create();
    }
}
