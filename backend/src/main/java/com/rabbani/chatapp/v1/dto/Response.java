package com.rabbani.chatapp.v1.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class Response<T> {
    private T payload;
    private String message;

    public Response(T payload) {
        this.payload = payload;
    }

    public Response(String message) {
        this.message = message;
    }
}
