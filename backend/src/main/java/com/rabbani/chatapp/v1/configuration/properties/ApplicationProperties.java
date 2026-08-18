package com.rabbani.chatapp.v1.configuration.properties;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import java.time.Duration;

@Data
@Validated
@ConfigurationProperties(prefix = "application")
public class ApplicationProperties {

    @Valid
    @NotNull
    private Session session;

    @Valid
    @NotNull
    private Otp otp;

    @Valid
    @NotNull
    private PasswordReset passwordReset;

    @Valid
    @NotNull
    private Upload upload;

    @Valid
    @NotNull
    private Websocket websocket;

    @Data
    public static class Session{

        @NotNull
        private String sameSite;

        @NotNull
        private Duration tokenTtl;

        @NotNull
        private Duration refreshTokenTtl;
    }

    @Data
    public static class Otp{

        @NotNull
        private Duration ttl;

        @Valid
        @NotNull
        private Email email;

        @Data
        public static class Email{
            private String apiKey;

            @NotBlank
            private String apiUrl;

            @NotNull
            private Sender from;
        }

        @Data
        public static class Sender{

            private String name;

            @NotBlank
            private String email;
        }
    }

    @Data
    public static class PasswordReset{

        @NotNull
        private Duration tokenTtl;
    }

    @Data
    public static class Upload{

        @NotBlank
        private String iconsDir;
    }

    @Data
    public static class Websocket{

        @NotBlank
        private String relayHost;

        @NotNull
        private Integer relayPort;

        @NotBlank
        private String login;

        @NotBlank
        private String passcode;
    }
}
