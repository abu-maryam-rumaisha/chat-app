package com.rabbani.chatapp.v1.controller;

import com.rabbani.chatapp.v1.dto.ConversationControllerDto;
import com.rabbani.chatapp.v1.dto.Response;
import com.rabbani.chatapp.v1.service.ConversationService;
import lombok.AllArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@AllArgsConstructor
@RequestMapping(path = "/api/v1/conversation")
public class ConverstationController {

    private final ConversationService conversationService;

    @GetMapping
    public Response<ConversationControllerDto.GetConversationResponse> get(
            @RequestParam(name = "page")
            Integer page,
            @RequestParam(name = "size")
            Integer size
    ){
        return new Response<>("");
    }
}
