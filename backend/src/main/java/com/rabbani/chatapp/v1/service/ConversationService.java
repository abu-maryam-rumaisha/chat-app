package com.rabbani.chatapp.v1.service;

import com.rabbani.chatapp.v1.dto.ConversationControllerDto;

import java.util.List;

public interface ConversationService {

    List<ConversationControllerDto.GetConversationResponse> getConversation();
}
