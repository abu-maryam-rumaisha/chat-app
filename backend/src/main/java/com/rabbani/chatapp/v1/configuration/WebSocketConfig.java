package com.rabbani.chatapp.v1.configuration;

import com.rabbani.chatapp.v1.configuration.properties.ApplicationProperties;
import com.rabbani.chatapp.v1.security.WebSocketHandshakeHandler;
import com.rabbani.chatapp.v1.security.WebSocketHandshakeInterceptor;
import lombok.AllArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
@AllArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final ApplicationProperties applicationProperties;

    private final WebSocketHandshakeInterceptor webSocketHandshakeInterceptor;

    private final WebSocketHandshakeHandler webSocketHandshakeHandler;

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setHandshakeHandler(webSocketHandshakeHandler)
                .addInterceptors(webSocketHandshakeInterceptor)
                .setAllowedOriginPatterns("*");
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        ApplicationProperties.Websocket relay = applicationProperties.getWebsocket();

        registry.enableStompBrokerRelay("/topic", "/queue")
                .setRelayHost(relay.getRelayHost())
                .setRelayPort(relay.getRelayPort())
                .setClientLogin(relay.getLogin())
                .setClientPasscode(relay.getPasscode())
                .setSystemLogin(relay.getLogin())
                .setSystemPasscode(relay.getPasscode())
                // The STOMP `host` header doubles as the RabbitMQ vhost name for the rabbitmq_stomp
                // plugin; without this it defaults to the relay host ("localhost"), which isn't a
                // real vhost, and RabbitMQ rejects the CONNECT with "Virtual host access denied".
                .setVirtualHost("/");
        registry.setApplicationDestinationPrefixes("/app");
        registry.setUserDestinationPrefix("/user");
    }
}
