package com.rabbani.chatapp.v1.controller;

import com.rabbani.chatapp.v1.dto.Response;
import com.rabbani.chatapp.v1.util.ResponseException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

@ControllerAdvice
public class ExceptionHandlerController {

    @ExceptionHandler(ResponseException.class)
    public ResponseEntity<Response<?>> handleException(ResponseException ex) {
        return ResponseEntity.status(ex.getStatus()).body(new Response<>(ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Response<?>> handleException(MethodArgumentNotValidException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new Response<>(ex.getAllErrors().get(0).getDefaultMessage()));
    }

}
