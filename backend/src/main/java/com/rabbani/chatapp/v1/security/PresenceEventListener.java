package com.rabbani.chatapp.v1.security;

import com.rabbani.chatapp.v1.service.PresenceService;
import lombok.AllArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.math.BigInteger;
import java.security.Principal;
import java.util.Optional;

/**
 * Marks a user online/offline as their STOMP sessions come and go. Both events carry the
 * Principal {@link WebSocketHandshakeHandler} attached at handshake time, so no extra lookup is
 * needed. {@code SessionDisconnectEvent} fires on ungraceful closes too (tab close, network drop),
 * not just a clean DISCONNECT frame.
 */
@Component
@AllArgsConstructor
public class PresenceEventListener {

    private final PresenceService presenceService;

    @EventListener
    public void handleSessionConnected(SessionConnectedEvent event) {
        userId(event.getUser()).ifPresent(presenceService::markOnline);
    }

    @EventListener
    public void handleSessionDisconnect(SessionDisconnectEvent event) {
        userId(event.getUser()).ifPresent(presenceService::markOffline);
    }

    private static Optional<BigInteger> userId(Principal user) {
        if (user == null) {
            return Optional.empty();
        }
        return Optional.of(new BigInteger(user.getName()));
    }
}
