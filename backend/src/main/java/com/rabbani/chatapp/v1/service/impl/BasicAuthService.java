package com.rabbani.chatapp.v1.service.impl;

import com.rabbani.chatapp.v1.configuration.properties.ApplicationProperties;
import com.rabbani.chatapp.v1.dto.AuthControllerDto;
import com.rabbani.chatapp.v1.dto.BrevoEmailDto;
import com.rabbani.chatapp.v1.dto.Response;
import com.rabbani.chatapp.v1.entity.UserEntity;
import com.rabbani.chatapp.v1.entity.UserStatus;
import com.rabbani.chatapp.v1.entity.query.UserAuthQuery;
import com.rabbani.chatapp.v1.repository.UserRepository;
import com.rabbani.chatapp.v1.service.AuthService;
import com.rabbani.chatapp.v1.util.*;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.AllArgsConstructor;
import org.springframework.data.redis.core.RedisOperations;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.thymeleaf.ITemplateEngine;
import org.thymeleaf.context.Context;

import java.util.Base64;
import java.util.List;
import java.util.random.RandomGenerator;
import java.util.regex.Pattern;

@Service
@AllArgsConstructor
public class BasicAuthService implements AuthService {

    private static final String BASIC_PREFIX = "Basic ";

    private static final String OTP_FORMAT = "%06d";

    private static final int OTP_BOUND = 1_000_000;

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");

    private final RedisOperations<String, UserSession.RedisUserSession> redisSessionRedisOperations;

    private final PasswordEncoder passwordEncoder;

    private final UserRepository userRepository;

    private final RandomGenerator secureRandom;

    private final ApplicationProperties applicationProperties;

    private final Session session;

    private final CacheManager.Cache<String,UserSession>  sessionCache;

    private final StringRedisTemplate stringRedisTemplate;

    private final RestClient restClient;

    private final ITemplateEngine templateEngine;

    @Override
    public Response<AuthControllerDto.SignInResponse> signIn(HttpServletRequest request, HttpServletResponse response) {
        String text = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (StringUtils.isEmpty(text) || text.length() <= BASIC_PREFIX.length() || !text.startsWith(BASIC_PREFIX)) {
            throw new ResponseException(HttpStatus.BAD_REQUEST, "Missing authorization header(basic)");
        }

        String value = text.substring(BASIC_PREFIX.length());
        String[] userPassword = new String(Base64.getDecoder().decode(value.getBytes())).split(":");

        if (userPassword.length != 2) {
            throw new ResponseException(HttpStatus.BAD_REQUEST, "Invalid authorization header(basic)");
        }

        UserAuthQuery userEntity = userRepository.findByEmail(userPassword[0]).orElseThrow(() -> new ResponseException(HttpStatus.UNAUTHORIZED, "Invalid username or password"));
        if (!passwordEncoder.matches(userPassword[1], userEntity.getPassword())) {
            throw new ResponseException(HttpStatus.UNAUTHORIZED, "Invalid username or password");
        }

        if (UserStatus.valueOf(userEntity.getStatus()) == UserStatus.pending) {
            throw new ResponseException(HttpStatus.FORBIDDEN, "Your account isn't verified yet");
        }

        byte[] data = new byte[35];
        String token;
        String refreshToken;
        String prefixedToken;
        String prefixedRefreshToken;
        do {
            secureRandom.nextBytes(data);
            token = Base64.getUrlEncoder().encodeToString(data);
            prefixedToken = RedisPrefix.token.serialize(token);
            if (!redisSessionRedisOperations.hasKey(prefixedToken)) {
                break;
            }
        }
        while (true);

        do {
            secureRandom.nextBytes(data);
            refreshToken = Base64.getUrlEncoder().encodeToString(data);
            prefixedRefreshToken = RedisPrefix.refreshToken.serialize(refreshToken);
            if (!redisSessionRedisOperations.hasKey(prefixedRefreshToken)) {
                break;
            }
        }
        while (true);

        UserSession.RedisUserSession session = new UserSession.RedisUserSession();
        session.setId(userEntity.getId());
        session.setEmail(userEntity.getEmail());
        session.setFirstName(userEntity.getFirstName());
        session.setLastName(userEntity.getLastName());
        session.setRefreshToken(token);
        session.setRefreshToken(refreshToken);
        session.setExpiresAt(System.currentTimeMillis()+applicationProperties.getSession().getTokenTtl().toMillis());

        AuthControllerDto.SignInResponse responsePayload = new AuthControllerDto.SignInResponse();
        responsePayload.setToken(token);
        responsePayload.setRefreshToken(refreshToken);
        responsePayload.setExpiresIn(applicationProperties.getSession().getTokenTtl().toSeconds());


        redisSessionRedisOperations.opsForValue().set(prefixedToken, session);
        redisSessionRedisOperations.expire(prefixedToken, applicationProperties.getSession().getTokenTtl());

        redisSessionRedisOperations.opsForValue().set(prefixedRefreshToken, session);
        redisSessionRedisOperations.expire(prefixedRefreshToken, applicationProperties.getSession().getRefreshTokenTtl());

        Cookie sessionTokenCookie = new Cookie(Session.COOKIE_SESSION_TOKEN_NAME, token);
        sessionTokenCookie.setMaxAge(((int) applicationProperties.getSession().getTokenTtl().toSeconds()) - 3);
        sessionTokenCookie.setPath("/");
        sessionTokenCookie.setHttpOnly(true);
        sessionTokenCookie.setSecure(true);
        sessionTokenCookie.setAttribute("SameSite", "Strict");
        response.addCookie(sessionTokenCookie);

        Cookie refreshTokenCookie = new Cookie(Session.COOKIE_SESSION_REFRESH_TOKEN_NAME, refreshToken);
        refreshTokenCookie.setMaxAge(((int) applicationProperties.getSession().getRefreshTokenTtl().toSeconds()) - 3);
        refreshTokenCookie.setPath("/");
        refreshTokenCookie.setHttpOnly(true);
        refreshTokenCookie.setSecure(true);
        refreshTokenCookie.setAttribute("SameSite", "Strict");
        response.addCookie(refreshTokenCookie);
        return new Response<>(responsePayload);
    }

    @Override
    public Response<AuthControllerDto.RefreshSessionResponse> refreshSession(AuthControllerDto.RefreshSessionRequest requestPayload, HttpServletRequest request, HttpServletResponse response) {
        String lookupToken = "";
        if (requestPayload != null && !StringUtils.isEmpty(requestPayload.getRefreshToken())) {
            lookupToken = requestPayload.getRefreshToken();
        } else {
            Cookie[] cookies = request.getCookies();
            if (cookies != null) {
                for (Cookie cookie : cookies) {
                    if (cookie.getName().equals(Session.COOKIE_SESSION_REFRESH_TOKEN_NAME)) {
                        lookupToken = cookie.getValue();
                        break;
                    }
                }
            }
        }

        UserSession oldSession = redisSessionRedisOperations.opsForValue().get(RedisPrefix.refreshToken.serialize(lookupToken));
        if (oldSession == null) {
            throw new ResponseException(HttpStatus.UNAUTHORIZED, "Invalid refresh token");
        }

        byte[] data = new byte[35];
        String token;
        String refreshToken;
        String prefixedToken;
        String prefixedRefreshToken;
        do {
            secureRandom.nextBytes(data);
            token = Base64.getEncoder().encodeToString(data);
            prefixedToken = RedisPrefix.token.serialize(token);
            if (!redisSessionRedisOperations.hasKey(prefixedToken)) {
                break;
            }
        }
        while (true);

        do {
            secureRandom.nextBytes(data);
            refreshToken = Base64.getEncoder().encodeToString(data);
            prefixedRefreshToken = RedisPrefix.refreshToken.serialize(refreshToken);
            if (!redisSessionRedisOperations.hasKey(prefixedRefreshToken)) {
                break;
            }
        }
        while (true);


        UserAuthQuery userEntity = userRepository.findById(oldSession.getId()).orElseThrow(() -> new ResponseException(HttpStatus.UNAUTHORIZED, "User does not exists"));
        UserSession.RedisUserSession session = new UserSession.RedisUserSession();
        session.setId(userEntity.getId());
        session.setEmail(userEntity.getEmail());
        session.setFirstName(userEntity.getFirstName());
        session.setLastName(userEntity.getLastName());
        session.setRefreshToken(token);
        session.setRefreshToken(refreshToken);
        session.setExpiresAt(System.currentTimeMillis()+applicationProperties.getSession().getTokenTtl().toMillis());

        AuthControllerDto.RefreshSessionResponse responsePayload = new AuthControllerDto.RefreshSessionResponse();
        responsePayload.setToken(token);
        responsePayload.setRefreshToken(refreshToken);
        responsePayload.setExpiresIn(applicationProperties.getSession().getTokenTtl().toSeconds());

        redisSessionRedisOperations.opsForValue().set(prefixedToken, session);
        redisSessionRedisOperations.expire(prefixedToken, applicationProperties.getSession().getTokenTtl());

        redisSessionRedisOperations.opsForValue().set(prefixedRefreshToken, session);
        redisSessionRedisOperations.expire(prefixedRefreshToken, applicationProperties.getSession().getRefreshTokenTtl());

        redisSessionRedisOperations.delete(RedisPrefix.token.serialize(oldSession.getToken()));
        redisSessionRedisOperations.delete(RedisPrefix.refreshToken.serialize(oldSession.getRefreshToken()));

        sessionCache.remove(token);
        Cookie sessionTokenCookie = new Cookie(Session.COOKIE_SESSION_TOKEN_NAME, token);
        sessionTokenCookie.setPath("/");
        sessionTokenCookie.setMaxAge(((int) applicationProperties.getSession().getTokenTtl().toSeconds()) - 3);
        response.addCookie(sessionTokenCookie);

        Cookie refreshTokenCookie = new Cookie(Session.COOKIE_SESSION_REFRESH_TOKEN_NAME, refreshToken);
        refreshTokenCookie.setPath("/");
        refreshTokenCookie.setMaxAge(((int) applicationProperties.getSession().getRefreshTokenTtl().toSeconds()) - 3);
        response.addCookie(refreshTokenCookie);
        refreshTokenCookie.toString();
        return new Response<>(responsePayload);
    }

    @Override
    public Response<?> signOut(HttpServletRequest request,HttpServletResponse response) {
        UserSession userSession = session.getSession();
        redisSessionRedisOperations.delete(RedisPrefix.token.serialize(userSession.getToken()));
        redisSessionRedisOperations.delete(RedisPrefix.refreshToken.serialize(userSession.getRefreshToken()));

        Cookie sessionTokenCookie = new Cookie(Session.COOKIE_SESSION_TOKEN_NAME, "");
        sessionTokenCookie.setMaxAge(0);
        sessionTokenCookie.setPath("/");
        response.addCookie(sessionTokenCookie);

        Cookie refreshTokenCookie = new Cookie(Session.COOKIE_SESSION_REFRESH_TOKEN_NAME, "");
        refreshTokenCookie.setMaxAge(0);
        refreshTokenCookie.setPath("/");
        response.addCookie(refreshTokenCookie);
        return new Response<>();
    }


    @Override
    public Response<AuthControllerDto.GenerateOtpResponse> generateOtp(AuthControllerDto.GenerateOtpRequest requestPayload) {
        validateRecipient(requestPayload.getType(), requestPayload.getRecipient());

        String code = String.format(OTP_FORMAT, secureRandom.nextInt(OTP_BOUND));
        String key = otpKey(requestPayload.getType(), requestPayload.getRecipient());
        stringRedisTemplate.opsForValue().set(key, code, applicationProperties.getOtp().getTtl());

        sendEmailOtp(requestPayload.getRecipient(), code);

        AuthControllerDto.GenerateOtpResponse response = new AuthControllerDto.GenerateOtpResponse();
        response.setMessage("OTP sent");
        return new Response<>(response);
    }

    @Override
    public Response<AuthControllerDto.VerifyOtpResponse> verifyOtp(AuthControllerDto.VerifyOtpRequest requestPayload) {
        validateRecipient(requestPayload.getType(), requestPayload.getRecipient());

        String key = otpKey(requestPayload.getType(), requestPayload.getRecipient());
        String storedCode = stringRedisTemplate.opsForValue().get(key);

        if (storedCode == null || !storedCode.equals(requestPayload.getCode())) {
            throw new ResponseException(HttpStatus.BAD_REQUEST, "Invalid or expired code");
        }

        stringRedisTemplate.delete(key);

        if (requestPayload.getType() == AuthControllerDto.OtpType.email) {
            UserEntity user = userRepository.findEntityByEmail(requestPayload.getRecipient())
                    .orElseThrow(() -> new ResponseException(HttpStatus.NOT_FOUND, "User does not exist"));
            user.setStatus(UserStatus.active);
            userRepository.save(user);
        }

        AuthControllerDto.VerifyOtpResponse response = new AuthControllerDto.VerifyOtpResponse();
        response.setVerified(true);
        return new Response<>(response);
    }

    @Override
    public Response<AuthControllerDto.VerifyPasswordResetOtpResponse> verifyPasswordResetOtp(AuthControllerDto.VerifyPasswordResetOtpRequest requestPayload) {
        validateRecipient(requestPayload.getType(), requestPayload.getRecipient());

        String key = otpKey(requestPayload.getType(), requestPayload.getRecipient());
        String storedCode = stringRedisTemplate.opsForValue().get(key);

        if (storedCode == null || !storedCode.equals(requestPayload.getCode())) {
            throw new ResponseException(HttpStatus.BAD_REQUEST, "Invalid or expired code");
        }

        stringRedisTemplate.delete(key);

        userRepository.findEntityByEmail(requestPayload.getRecipient())
                .orElseThrow(() -> new ResponseException(HttpStatus.BAD_REQUEST, "Invalid or expired code"));

        byte[] data = new byte[35];
        secureRandom.nextBytes(data);
        String resetToken = Base64.getUrlEncoder().encodeToString(data);

        stringRedisTemplate.opsForValue().set(
                RedisPrefix.passwordReset.serialize(resetToken),
                requestPayload.getRecipient(),
                applicationProperties.getPasswordReset().getTokenTtl()
        );

        AuthControllerDto.VerifyPasswordResetOtpResponse response = new AuthControllerDto.VerifyPasswordResetOtpResponse();
        response.setResetToken(resetToken);
        return new Response<>(response);
    }

    @Override
    public Response<AuthControllerDto.ResetPasswordResponse> resetPassword(AuthControllerDto.ResetPasswordRequest requestPayload) {
        String key = RedisPrefix.passwordReset.serialize(requestPayload.getResetToken());
        String recipient = stringRedisTemplate.opsForValue().get(key);

        if (recipient == null) {
            throw new ResponseException(HttpStatus.BAD_REQUEST, "Invalid or expired reset token");
        }

        stringRedisTemplate.delete(key);

        UserEntity user = userRepository.findEntityByEmail(recipient)
                .orElseThrow(() -> new ResponseException(HttpStatus.BAD_REQUEST, "Invalid or expired reset token"));
        user.setPassword(passwordEncoder.encode(requestPayload.getNewPassword()));
        userRepository.save(user);

        AuthControllerDto.ResetPasswordResponse response = new AuthControllerDto.ResetPasswordResponse();
        response.setReset(true);
        return new Response<>(response);
    }

    private String otpKey(AuthControllerDto.OtpType type, String recipient) {
        return RedisPrefix.otp.serialize(type.name() + ":" + recipient);
    }

    private void sendEmailOtp(String recipient, String code) {
        ApplicationProperties.Otp.Email emailProperties = applicationProperties.getOtp().getEmail();

        Context templateContext = new Context();
        templateContext.setVariable("code", code);
        templateContext.setVariable("ttlMinutes", applicationProperties.getOtp().getTtl().toMinutes());
        String html = templateEngine.process("otp-email", templateContext);

        BrevoEmailDto.Sender sender = new BrevoEmailDto.Sender(
                emailProperties.getFrom().getEmail(),
                StringUtils.isEmpty(emailProperties.getFrom().getName()) ? null : emailProperties.getFrom().getName()
        );

        BrevoEmailDto.SendEmailRequest body = new BrevoEmailDto.SendEmailRequest(
                sender,
                List.of(new BrevoEmailDto.Recipient(recipient)),
                "Your verification code",
                html,
                "Your verification code is " + code
        );

        try {
            restClient.post()
                    .uri(emailProperties.getApiUrl())
                    .header("api-key", emailProperties.getApiKey())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientException e) {
            throw new ResponseException(HttpStatus.BAD_GATEWAY, "Failed to send OTP email");
        }
    }

    private void validateRecipient(AuthControllerDto.OtpType type, String recipient) {
        if (StringUtils.isEmpty(recipient)) {
            throw new ResponseException(HttpStatus.BAD_REQUEST, "Recipient is required");
        }

        if (type == AuthControllerDto.OtpType.email && !EMAIL_PATTERN.matcher(recipient).matches()) {
            throw new ResponseException(HttpStatus.BAD_REQUEST, "Invalid email recipient");
        }
    }

}
