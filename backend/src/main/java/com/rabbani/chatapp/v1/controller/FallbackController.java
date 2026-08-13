package com.rabbani.chatapp.v1.controller;

import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@Slf4j
@RestControllerAdvice
public class FallbackController {

    @ExceptionHandler(Exception.class)
    public ResponseEntity<String> fallback(HttpServletRequest request,Exception ex){
        log.error("request : {}",request.getRequestURI(), ex);
        return ResponseEntity.status(500).body("Internal Server Error");
    }
}
