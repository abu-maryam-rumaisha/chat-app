package com.rabbani.chatapp.v1.entity.query;

import java.math.BigInteger;
import java.time.LocalDateTime;

public interface ConversationSummaryQuery {

    Long getId();

    BigInteger getOtherUserId();

    String getOtherFirstName();

    String getOtherLastName();

    String getOtherEmail();

    String getLastMessage();

    LocalDateTime getLastMessageAt();
}
