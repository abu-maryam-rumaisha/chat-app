package com.rabbani.chatapp.v1.controller;

import com.rabbani.chatapp.v1.dto.AuthControllerDto;
import com.rabbani.chatapp.v1.dto.Response;
import com.rabbani.chatapp.v1.service.AuthService;
import com.rabbani.chatapp.v1.util.Session;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(path = "/api/v1/auth")
public class AuthController {

    private final AuthService authService;

    private Session.Validator signOutValidator;

    private final Session session;

    public AuthController(AuthService authService, Session session) {
        this.authService = authService;
        this.session = session;
    }

    @PostMapping("/sign-in")
    @Operation(security = @SecurityRequirement(name = "basicAuth"))
    public ResponseEntity<Response<AuthControllerDto.SignInResponse>> signIn(
            HttpServletRequest request,
            HttpServletResponse response
    ){
        return ResponseEntity.ok().body(authService.signIn(request,response));
    }

    @PostMapping("/otp")
    public ResponseEntity<Response<AuthControllerDto.GenerateOtpResponse>> generateOtp(
            @Valid
            @RequestBody
            AuthControllerDto.GenerateOtpRequest requestPayload
    ){
        return ResponseEntity.ok(authService.generateOtp(requestPayload));
    }

    @PostMapping("/otp/verification")
    public ResponseEntity<Response<AuthControllerDto.VerifyOtpResponse>> verifyOtp(
            @Valid
            @RequestBody
            AuthControllerDto.VerifyOtpRequest requestPayload
    ){
        return ResponseEntity.ok(authService.verifyOtp(requestPayload));
    }

    @PostMapping("/password-reset/otp/verification")
    public ResponseEntity<Response<AuthControllerDto.VerifyPasswordResetOtpResponse>> verifyPasswordResetOtp(
            @Valid
            @RequestBody
            AuthControllerDto.VerifyPasswordResetOtpRequest requestPayload
    ){
        return ResponseEntity.ok(authService.verifyPasswordResetOtp(requestPayload));
    }

    @PostMapping("/password-reset")
    public ResponseEntity<Response<AuthControllerDto.ResetPasswordResponse>> resetPassword(
            @Valid
            @RequestBody
            AuthControllerDto.ResetPasswordRequest requestPayload
    ){
        return ResponseEntity.ok(authService.resetPassword(requestPayload));
    }

    @PostMapping("/sign-out")
    public ResponseEntity<Response<?>> signOut(HttpServletRequest request,HttpServletResponse response){
        if(signOutValidator == null) {
            signOutValidator = session.auth();
        }
        signOutValidator.validate();

        return ResponseEntity.ok().body(authService.signOut(request,response));
    }

    @PostMapping("/refresh-session")
    public ResponseEntity<Response<AuthControllerDto.RefreshSessionResponse>> refreshSession(
            @Valid
            AuthControllerDto.RefreshSessionRequest requestPayload,
            HttpServletRequest request,
            HttpServletResponse response
    ){
        return ResponseEntity.ok().body(authService.refreshSession(requestPayload,request,response));
    }
}
