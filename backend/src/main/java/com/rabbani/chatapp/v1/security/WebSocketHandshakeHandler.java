package com.rabbani.chatapp.v1.security;

import org.springframework.http.server.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.support.DefaultHandshakeHandler;

import java.security.Principal;
import java.util.Map;

/** Turns the user id stashed by {@link WebSocketHandshakeInterceptor} into the STOMP session's Principal. */
@Component
public class WebSocketHandshakeHandler extends DefaultHandshakeHandler {

    @Override
    protected Principal determineUser(ServerHttpRequest request, WebSocketHandler wsHandler, Map<String, Object> attributes) {
        Object userId = attributes.get("userId");
        return userId == null ? null : new StompPrincipal(userId.toString());
    }
}
