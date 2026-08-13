package com.rabbani.chatapp.v1.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

public interface ConversationControllerDto {

    @Data
    class GetConversationResponse{
        private String id;
        private String name;
        private List<UserIcon> interlocutors;
        private LocalDateTime latestUpdate;
    }

    @Data
    class UserIcon{
        private String id;
        private String icon;
        private String name;
    }

}
