package com.rabbani.chatapp.v1.entity.query;

import java.time.LocalDateTime;

public interface ConversationMessageQuery {

    Long getId();

    String getMessage();

    LocalDateTime getRecordAt();

    boolean isOutgoing();
}
