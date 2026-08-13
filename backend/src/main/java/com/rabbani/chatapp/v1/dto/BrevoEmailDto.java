package com.rabbani.chatapp.v1.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

public interface BrevoEmailDto {

    @Data
    @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    class Sender {
        private String email;
        private String name;
    }

    @Data
    @AllArgsConstructor
    class Recipient {
        private String email;
    }

    @Data
    @AllArgsConstructor
    class SendEmailRequest {
        private Sender sender;
        private List<Recipient> to;
        private String subject;
        private String htmlContent;
        private String textContent;
    }
}
