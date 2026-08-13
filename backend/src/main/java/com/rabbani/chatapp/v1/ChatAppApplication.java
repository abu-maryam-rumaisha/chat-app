package com.rabbani.chatapp.v1;

import com.fasterxml.uuid.Generators;
import com.fasterxml.uuid.NoArgGenerator;
import com.rabbani.chatapp.v1.entity.query.UserAuthQuery;
import com.rabbani.chatapp.v1.repository.UserRepository;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.security.autoconfigure.UserDetailsServiceAutoConfiguration;
import org.springframework.context.ConfigurableApplicationContext;

import java.util.Optional;

@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
public class ChatAppApplication {

	public static void main(String[] args) {
		ConfigurableApplicationContext context = SpringApplication.run(ChatAppApplication.class, args);
	}

}
