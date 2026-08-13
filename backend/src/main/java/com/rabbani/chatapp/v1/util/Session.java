package com.rabbani.chatapp.v1.util;

import com.rabbani.chatapp.v1.security.SessionAuthenticationToken;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Component
@AllArgsConstructor
public class Session{

    public static final String COOKIE_SESSION_TOKEN_NAME = "_session_token";

    public static final String COOKIE_SESSION_REFRESH_TOKEN_NAME = "_session_refresh_token";

    private final Map<String,AuthQualifier> authQualifiers = new HashMap<>();

    public UserSession getSession() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication instanceof SessionAuthenticationToken sessionAuthenticationToken) {
            return sessionAuthenticationToken.getUserSession();
        }
        return null;
    }




    public Validator auth(String... codes){
        Map<Integer,Long> authQualifiers = new HashMap<>();
        for(String code : codes){
            AuthQualifier authQualifier = this.authQualifiers.get(code);
            if(authQualifier == null){
                throw new RuntimeException("Invalid '"+code+"' no module found for given code");
            }
            long prev = authQualifiers.getOrDefault(authQualifier.index,0l);
            authQualifiers.put(authQualifier.index,prev|authQualifier.bitMask);
        }

        return ()->{
            UserSession currentSession = getSession();
            if (currentSession == null){
                throw new ResponseException(HttpStatus.UNAUTHORIZED,"Unauthorized");
            }

            if(!authQualifiers.isEmpty()){
                boolean isAuthorized = false;
               for(Map.Entry<Integer,Long> authQualifier: authQualifiers.entrySet()){
                   Long[] userAccess = currentSession.getQualifier();
                   if(userAccess == null || userAccess.length <= authQualifier.getKey() || userAccess[authQualifier.getKey()] == null){
                       continue;
                   }

                   long access = userAccess[authQualifier.getKey()];

                   if((access & authQualifier.getValue().longValue()) > 0L){
                       isAuthorized = true;
                       break;
                   }
               }

               if(!isAuthorized){
                   throw new ResponseException(HttpStatus.FORBIDDEN,"Forbidden");
               }
            }
        };
    }

    @AllArgsConstructor
    private static class AuthQualifier{
        Integer index;
        Long bitMask;
    }

    public interface Validator{
        void validate();
    }

}
