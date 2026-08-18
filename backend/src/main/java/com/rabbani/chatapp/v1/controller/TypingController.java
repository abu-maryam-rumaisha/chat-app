package com.rabbani.chatapp.v1.controller;

import com.rabbani.chatapp.v1.dto.ConversationControllerDto;
import com.rabbani.chatapp.v1.service.ConversationService;
import lombok.AllArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
@AllArgsConstructor
public class TypingController {

    private final ConversationService conversationService;

    @MessageMapping("/typing")
    public void typing(ConversationControllerDto.TypingRequest requestPayload, Principal principal) {
        if (principal == null) {
            return;
        }

        conversationService.sendTyping(Long.valueOf(principal.getName()), requestPayload);
    }
}
