package com.rabbani.chatapp.v1.util;

import lombok.Data;
import org.springframework.http.HttpStatus;

@Data
public class ResponseException extends RuntimeException{
    private HttpStatus status;

    public ResponseException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }
}
