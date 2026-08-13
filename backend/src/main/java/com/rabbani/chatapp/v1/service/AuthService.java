package com.rabbani.chatapp.v1.service;

import com.rabbani.chatapp.v1.dto.AuthControllerDto;
import com.rabbani.chatapp.v1.dto.Response;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

public interface AuthService {

    Response<AuthControllerDto.SignInResponse> signIn(HttpServletRequest request, HttpServletResponse response);

    Response<AuthControllerDto.RefreshSessionResponse> refreshSession(AuthControllerDto.RefreshSessionRequest requestPayload,HttpServletRequest request,HttpServletResponse response);

    Response<?> signOut(HttpServletRequest request,HttpServletResponse response);

    Response<AuthControllerDto.GenerateOtpResponse> generateOtp(AuthControllerDto.GenerateOtpRequest requestPayload);

    Response<AuthControllerDto.VerifyOtpResponse> verifyOtp(AuthControllerDto.VerifyOtpRequest requestPayload);

    Response<AuthControllerDto.VerifyPasswordResetOtpResponse> verifyPasswordResetOtp(AuthControllerDto.VerifyPasswordResetOtpRequest requestPayload);

    Response<AuthControllerDto.ResetPasswordResponse> resetPassword(AuthControllerDto.ResetPasswordRequest requestPayload);
}
