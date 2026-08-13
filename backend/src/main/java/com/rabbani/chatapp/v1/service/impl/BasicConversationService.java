package com.rabbani.chatapp.v1.service.impl;

import com.rabbani.chatapp.v1.dto.ConversationControllerDto;
import com.rabbani.chatapp.v1.service.ConversationService;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class BasicConversationService implements ConversationService {

    @Override
    public List<ConversationControllerDto.GetConversationResponse> getConversation() {
        return List.of();
    }
}
