package com.rabbani.chatapp.v1.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.math.BigInteger;
import java.util.List;

public interface UserControllerDto {

    @Data
    class GetMeResponse{
        private BigInteger id;
        private String icon;
        private String firstName;
        private String lastName;
    }

    @Data
    class SignupRequest{

        @NotBlank(message = "email is required")
        @Email(message = "email must be valid")
        private String email;

        @NotBlank(message = "password is required")
        private String password;

        @NotBlank(message = "firstName is required")
        private String firstName;

        private String lastName;

        private String timezone;

        private String lang;
    }

    @Data
    class SignupResponse{
        private BigInteger id;
        private String email;
    }

    @Data
    class EmailAvailabilityRequest{

        @NotBlank(message = "email is required")
        @Email(message = "email must be valid")
        private String email;
    }

    @Data
    class EmailAvailabilityResponse{
        private boolean available;
    }

    @Data
    class GetContactsResponse{
        private List<Contact> items;
        private boolean hasMore;
    }

    @Data
    class Contact{
        private BigInteger id;
        private String firstName;
        private String lastName;
        private String email;
        private boolean online;
    }

}
