package com.rabbani.chatapp.v1.entity.query;

import java.math.BigInteger;

public interface UserAuthQuery {

    BigInteger getId();

    String getEmail();

    String getPassword();

    String getFirstName();

    String getLastName();

    String getStatus();

}
