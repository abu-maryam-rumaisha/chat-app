package com.rabbani.chatapp.v1.controller;

import com.rabbani.chatapp.v1.dto.ConversationControllerDto;
import com.rabbani.chatapp.v1.dto.Response;
import com.rabbani.chatapp.v1.service.ConversationService;
import com.rabbani.chatapp.v1.util.Session;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigInteger;

@RestController
@RequestMapping(path = "/api/v1/conversation")
public class ConverstationController {

    private final ConversationService conversationService;

    private final Session session;

    private Session.Validator getConversationsValidator;

    private Session.Validator getMessagesValidator;

    private Session.Validator findDirectMessageValidator;

    private Session.Validator createDirectMessageValidator;

    public ConverstationController(ConversationService conversationService, Session session) {
        this.conversationService = conversationService;
        this.session = session;
    }

    @GetMapping
    public ResponseEntity<Response<ConversationControllerDto.GetConversationsResponse>> get(
            @RequestParam(name = "page", defaultValue = "0")
            Integer page,
            @RequestParam(name = "size", defaultValue = "20")
            Integer size
    ){
        if (getConversationsValidator == null) {
            getConversationsValidator = session.auth();
        }
        getConversationsValidator.validate();

        return ResponseEntity.ok(conversationService.getConversations(page, size));
    }

    @GetMapping("/{conversationId}/messages")
    public ResponseEntity<Response<ConversationControllerDto.GetConversationMessagesResponse>> getMessages(
            @PathVariable(name = "conversationId")
            Long conversationId,
            @RequestParam(name = "page", defaultValue = "0")
            Integer page,
            @RequestParam(name = "size", defaultValue = "30")
            Integer size
    ){
        if (getMessagesValidator == null) {
            getMessagesValidator = session.auth();
        }
        getMessagesValidator.validate();

        return ResponseEntity.ok(conversationService.getMessages(conversationId, page, size));
    }

    @GetMapping("/direct")
    public ResponseEntity<Response<ConversationControllerDto.CreateDirectMessageResponse>> findDirectMessage(
            @RequestParam(name = "userId") BigInteger userId
    ){
        if (findDirectMessageValidator == null) {
            findDirectMessageValidator = session.auth();
        }
        findDirectMessageValidator.validate();

        return ResponseEntity.ok(conversationService.findDirectMessage(userId));
    }

    @PostMapping("/direct")
    public ResponseEntity<Response<ConversationControllerDto.CreateDirectMessageResponse>> createDirectMessage(
            @Valid @RequestBody ConversationControllerDto.CreateDirectMessageRequest requestPayload
    ){
        if (createDirectMessageValidator == null) {
            createDirectMessageValidator = session.auth();
        }
        createDirectMessageValidator.validate();

        return ResponseEntity.ok(conversationService.postDirectMessage(requestPayload));
    }
}
