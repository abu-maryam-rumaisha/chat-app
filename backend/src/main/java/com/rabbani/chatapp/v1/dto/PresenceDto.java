package com.rabbani.chatapp.v1.dto;

import lombok.Data;

import java.math.BigInteger;

public interface PresenceDto {

    @Data
    class PresenceEvent {
        private BigInteger userId;
        private boolean online;
    }
}
