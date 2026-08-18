package com.rabbani.chatapp.v1.service;

import com.rabbani.chatapp.v1.dto.PresenceDto;
import com.rabbani.chatapp.v1.util.RedisPrefix;
import lombok.AllArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.math.BigInteger;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Tracks who's online in Redis, keyed by a per-user connection count rather than a single flag, so
 * a user with several tabs/devices open doesn't flicker offline the moment just one of them
 * disconnects — only when the last one does.
 */
@Service
@AllArgsConstructor
public class PresenceService {

    private final StringRedisTemplate stringRedisTemplate;

    private final SimpMessagingTemplate messagingTemplate;

    public void markOnline(BigInteger userId) {
        Long count = stringRedisTemplate.opsForValue().increment(RedisPrefix.presence.serialize(userId.toString()));
        if (count != null && count == 1L) {
            broadcast(userId, true);
        }
    }

    public void markOffline(BigInteger userId) {
        String key = RedisPrefix.presence.serialize(userId.toString());
        Long count = stringRedisTemplate.opsForValue().decrement(key);
        if (count != null && count <= 0L) {
            stringRedisTemplate.delete(key);
            broadcast(userId, false);
        }
    }

    /** Batched so list endpoints (contacts, conversations) make one Redis round-trip, not one per row. */
    public Set<BigInteger> onlineAmong(Collection<BigInteger> userIds) {
        if (userIds.isEmpty()) {
            return Set.of();
        }

        List<BigInteger> ids = List.copyOf(userIds);
        List<String> keys = ids.stream()
                .map(id -> RedisPrefix.presence.serialize(id.toString()))
                .collect(Collectors.toList());

        List<String> values = stringRedisTemplate.opsForValue().multiGet(keys);
        Set<BigInteger> online = new HashSet<>();
        if (values == null) {
            return online;
        }

        for (int i = 0; i < ids.size(); i++) {
            if (values.get(i) != null) {
                online.add(ids.get(i));
            }
        }
        return online;
    }

    private void broadcast(BigInteger userId, boolean online) {
        PresenceDto.PresenceEvent event = new PresenceDto.PresenceEvent();
        event.setUserId(userId);
        event.setOnline(online);
        messagingTemplate.convertAndSend("/topic/presence", event);
    }
}
