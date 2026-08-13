package com.rabbani.chatapp.v1.security;

import com.rabbani.chatapp.v1.util.UserSession;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;

public class SessionAuthenticationToken extends AbstractAuthenticationToken {

    private final UserSession userSession;

    public SessionAuthenticationToken(UserSession userSession) {
        super(AuthorityUtils.createAuthorityList("ROLE_USER"));
        this.userSession = userSession;
        super.setAuthenticated(true);
    }

    public UserSession getUserSession() {
        return userSession;
    }

    @Override
    public Object getCredentials() {
        return null;
    }

    @Override
    public Object getPrincipal() {
        return userSession;
    }
}
