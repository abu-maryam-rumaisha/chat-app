package com.rabbani.chatapp.v1.security;

import com.rabbani.chatapp.v1.util.Session;
import com.rabbani.chatapp.v1.util.UserSession;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.Map;

/**
 * The WS handshake is a plain HTTP GET that goes through the same Spring Security filter chain
 * as every other request, so {@link Session#getSession()} is already populated from the
 * {@code _session_token} cookie by the time this runs. Stashes the user id into the handshake
 * attributes so {@link WebSocketHandshakeHandler} can turn it into the STOMP session's Principal.
 */
@Component
@AllArgsConstructor
public class WebSocketHandshakeInterceptor implements HandshakeInterceptor {

    private final Session session;

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response, WebSocketHandler wsHandler, Map<String, Object> attributes) {
        UserSession userSession = session.getSession();
        if (userSession == null) {
            response.setStatusCode(HttpStatus.UNAUTHORIZED);
            return false;
        }

        attributes.put("userId", userSession.getId().toString());
        return true;
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response, WebSocketHandler wsHandler, Exception exception) {
    }
}
