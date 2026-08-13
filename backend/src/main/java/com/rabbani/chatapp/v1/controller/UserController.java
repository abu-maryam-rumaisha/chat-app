package com.rabbani.chatapp.v1.controller;

import com.rabbani.chatapp.v1.dto.Response;
import com.rabbani.chatapp.v1.dto.UserControllerDto;
import com.rabbani.chatapp.v1.service.UserService;
import com.rabbani.chatapp.v1.util.Session;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping(path = "/api/v1/user")
public class UserController {

    private final UserService userService;

    private final Session session;

    private Session.Validator meValidator;

    public UserController(UserService userService, Session session) {
        this.userService = userService;
        this.session = session;
    }

    @GetMapping("/me")
    public ResponseEntity<Response<UserControllerDto.GetMeResponse>> getMe(){
        if(meValidator == null){
            meValidator = session.auth();
        }
        meValidator.validate();

        return ResponseEntity.ok(userService.getMe());

    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Response<UserControllerDto.SignupResponse>> signup(
            @Valid @ModelAttribute UserControllerDto.SignupRequest requestPayload,
            @RequestParam(value = "icon", required = false) MultipartFile icon){
        return ResponseEntity.ok(userService.signup(requestPayload, icon));
    }

    @PostMapping("/email-availability")
    public ResponseEntity<Response<UserControllerDto.EmailAvailabilityResponse>> checkEmailAvailability(@Valid @RequestBody UserControllerDto.EmailAvailabilityRequest requestPayload){
        return ResponseEntity.ok(userService.checkEmailAvailability(requestPayload));
    }
}
