package com.rabbani.chatapp.v1.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigInteger;
import java.time.LocalDateTime;
import java.util.List;

public interface ConversationControllerDto {

    @Data
    class GetConversationResponse{
        private Long id;
        private Interlocutor interlocutor;
        private String lastMessage;
        private LocalDateTime lastMessageAt;
    }

    @Data
    class GetConversationsResponse{
        private List<GetConversationResponse> items;
        private boolean hasMore;
    }

    @Data
    class Interlocutor{
        private BigInteger id;
        private String firstName;
        private String lastName;
        private String email;
        private boolean online;
    }

    @Data
    class ConversationMessage{
        private Long id;
        private String message;
        private boolean outgoing;
        private LocalDateTime recordAt;
    }

    @Data
    class ConversationMessageEvent{
        private Long conversationId;
        private Long id;
        private String message;
        private boolean outgoing;
        private LocalDateTime recordAt;
        private BigInteger otherUserId;
    }

    @Data
    class GetConversationMessagesResponse{
        private List<ConversationMessage> items;
        private boolean hasMore;
    }

    @Data
    class CreateDirectMessageRequest{

        @NotNull(message = "userId is required")
        private BigInteger userId;

        @NotBlank(message = "message is required")
        private String message;
    }

    @Data
    class CreateDirectMessageResponse{
        private Long id;
    }

    @Data
    class TypingRequest{
        private BigInteger otherUserId;
        private boolean typing;
    }

    @Data
    class TypingEvent{
        private BigInteger userId;
        private boolean typing;
    }

}
