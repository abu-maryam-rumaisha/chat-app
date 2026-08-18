package com.rabbani.chatapp.v1.util;

import net.openhft.hashing.LongHashFunction;

import java.util.List;
import java.util.stream.Collectors;

public interface ConversationSignature {

    String SEPARATOR = ";";

    static String generate(Long groupId, List<Long> userIds) {
        String source = groupId != null
                ? String.valueOf(groupId)
                : userIds.stream()
                        .sorted()
                        .map(String::valueOf)
                        .collect(Collectors.joining(SEPARATOR));
        return Long.toHexString(LongHashFunction.xx3().hashChars(source));
    }

}
