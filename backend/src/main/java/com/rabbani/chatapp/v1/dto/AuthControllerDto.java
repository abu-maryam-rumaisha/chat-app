package com.rabbani.chatapp.v1.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

public interface AuthControllerDto {

    enum OtpType{
        email
    }

    @Data
    class SignInResponse{
        private String token;
        private String refreshToken;
        private Long expiresIn;
    }

    @Data
    class RefreshSessionRequest{
        private String refreshToken;
    }

    @Data
    class RefreshSessionResponse{
        private String token;
        private String refreshToken;
        private Long expiresIn;
    }

    @Data
    class GenerateOtpRequest{

        @NotNull(message = "type is required")
        private AuthControllerDto.OtpType type;

        @NotBlank(message = "recipient is required")
        private String recipient;
    }

    @Data
    class GenerateOtpResponse{
        private String message;
    }

    @Data
    class VerifyOtpRequest{

        @NotNull(message = "type is required")
        private AuthControllerDto.OtpType type;

        @NotBlank(message = "recipient is required")
        private String recipient;

        @NotBlank(message = "code is required")
        private String code;
    }

    @Data
    class VerifyOtpResponse{
        private boolean verified;
    }

    @Data
    class VerifyPasswordResetOtpRequest{

        @NotNull(message = "type is required")
        private AuthControllerDto.OtpType type;

        @NotBlank(message = "recipient is required")
        private String recipient;

        @NotBlank(message = "code is required")
        private String code;
    }

    @Data
    class VerifyPasswordResetOtpResponse{
        private String resetToken;
    }

    @Data
    class ResetPasswordRequest{

        @NotBlank(message = "resetToken is required")
        private String resetToken;

        @NotBlank(message = "newPassword is required")
        private String newPassword;
    }

    @Data
    class ResetPasswordResponse{
        private boolean reset;
    }
}
