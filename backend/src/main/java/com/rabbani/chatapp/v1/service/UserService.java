package com.rabbani.chatapp.v1.service;

import com.rabbani.chatapp.v1.dto.Response;
import com.rabbani.chatapp.v1.dto.UserControllerDto;
import org.springframework.web.multipart.MultipartFile;

public interface UserService {

    Response<UserControllerDto.GetMeResponse> getMe();

    Response<UserControllerDto.SignupResponse> signup(UserControllerDto.SignupRequest requestPayload, MultipartFile icon);

    Response<UserControllerDto.EmailAvailabilityResponse> checkEmailAvailability(UserControllerDto.EmailAvailabilityRequest requestPayload);

    Response<UserControllerDto.GetContactsResponse> getContacts(String search, int page, int size);

}
