package com.rabbani.chatapp.v1.security;

import com.rabbani.chatapp.v1.util.CacheManager;
import com.rabbani.chatapp.v1.util.RedisPrefix;
import com.rabbani.chatapp.v1.util.Session;
import com.rabbani.chatapp.v1.util.StringUtils;
import com.rabbani.chatapp.v1.util.UserSession;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.AllArgsConstructor;
import org.springframework.data.redis.core.RedisOperations;
import org.springframework.http.HttpHeaders;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpRequestResponseHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.stereotype.Component;

@Component
@AllArgsConstructor
public class SessionTokenSecurityContextRepository implements SecurityContextRepository {

    private static final String BEARER_PREFIX = "Bearer ";

    private final RedisOperations<String, UserSession.RedisUserSession> redisUserSessionRedisOperations;

    private final CacheManager.Cache<String, UserSession> sessionCache;

    @Override
    @SuppressWarnings("deprecation")
    public SecurityContext loadContext(HttpRequestResponseHolder requestResponseHolder) {
        return buildContext(requestResponseHolder.getRequest());
    }

    @Override
    public void saveContext(SecurityContext context, HttpServletRequest request, HttpServletResponse response) {
        // stateless: the session already lives in Redis from sign-in, nothing to persist here
    }

    @Override
    public boolean containsContext(HttpServletRequest request) {
        return extractToken(request) != null;
    }

    private SecurityContext buildContext(HttpServletRequest request) {
        SecurityContext context = SecurityContextHolder.createEmptyContext();

        String token = extractToken(request);
        if (token == null) {
            return context;
        }

        UserSession userSession = sessionCache.get(
                token,
                currentSession -> currentSession == null || currentSession.getExpiresAt() > System.currentTimeMillis(),
                currentToken -> redisUserSessionRedisOperations.opsForValue().get(RedisPrefix.token.serialize(currentToken))
        );

        if (userSession == null) {
            sessionCache.remove(token);
            return context;
        }

        context.setAuthentication(new SessionAuthenticationToken(userSession));
        return context;
    }

    private String extractToken(HttpServletRequest request) {
        String auth = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (!StringUtils.isEmpty(auth) && auth.length() > BEARER_PREFIX.length() && auth.startsWith(BEARER_PREFIX)) {
            return auth.substring(BEARER_PREFIX.length());
        }

        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if (cookie.getName().equals(Session.COOKIE_SESSION_TOKEN_NAME)) {
                    return cookie.getValue();
                }
            }
        }

        return null;
    }
}
