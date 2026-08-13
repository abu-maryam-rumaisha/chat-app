package com.rabbani.chatapp.v1.util;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;

@AllArgsConstructor(access = AccessLevel.PRIVATE)
public enum RedisPrefix {
    token("session:token:"),refreshToken("session:refreshToken:"),otp("otp:"),passwordReset("password-reset:");
    private String prefix;

    public String serialize(String token){
        return prefix + token;
    }

}
