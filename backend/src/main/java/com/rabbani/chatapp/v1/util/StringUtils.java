package com.rabbani.chatapp.v1.util;

public interface StringUtils {

    static boolean isEmpty(String text){
        return text == null || text.isBlank();
    }

}
