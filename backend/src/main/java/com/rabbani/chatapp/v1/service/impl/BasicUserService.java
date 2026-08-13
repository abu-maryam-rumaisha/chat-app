package com.rabbani.chatapp.v1.service.impl;

import com.fasterxml.uuid.NoArgGenerator;
import com.rabbani.chatapp.v1.configuration.properties.ApplicationProperties;
import com.rabbani.chatapp.v1.dto.Response;
import com.rabbani.chatapp.v1.dto.UserControllerDto;
import com.rabbani.chatapp.v1.entity.UserEntity;
import com.rabbani.chatapp.v1.entity.UserStatus;
import com.rabbani.chatapp.v1.repository.UserRepository;
import com.rabbani.chatapp.v1.service.UserService;
import com.rabbani.chatapp.v1.util.ResponseException;
import com.rabbani.chatapp.v1.util.Session;
import com.rabbani.chatapp.v1.util.UserSession;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigInteger;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;

@Service
@AllArgsConstructor
public class BasicUserService implements UserService {

    private final UserRepository userRepository;

    private final Session session;

    private final PasswordEncoder passwordEncoder;

    private final NoArgGenerator uuidGenerator;

    private final ApplicationProperties applicationProperties;

    @Override
    public Response<UserControllerDto.GetMeResponse> getMe() {
        UserSession userSession = session.getSession();
        UserControllerDto.GetMeResponse response = new UserControllerDto.GetMeResponse();
        response.setId(userSession.getId());
        response.setFirstName(response.getFirstName());
        response.setLastName(response.getLastName());
        return new Response<>(response);
    }

    @Override
    public Response<UserControllerDto.SignupResponse> signup(UserControllerDto.SignupRequest requestPayload, MultipartFile icon) {
        if (userRepository.existsByEmailIgnoreCase(requestPayload.getEmail())) {
            throw new ResponseException(HttpStatus.CONFLICT, "Email is already registered");
        }

        UserEntity user = new UserEntity();
        user.setSignature(uuidGenerator.generate().toString());
        user.setEmail(requestPayload.getEmail());
        user.setPassword(passwordEncoder.encode(requestPayload.getPassword()));
        user.setFirstName(requestPayload.getFirstName());
        user.setLastName(requestPayload.getLastName());
        user.setTimezone(requestPayload.getTimezone());
        user.setLang(requestPayload.getLang());
        user.setStatus(UserStatus.pending);
        user.setCreatedAt(LocalDateTime.now());
        user.setCreatedBy(requestPayload.getEmail());

        UserEntity saved = userRepository.save(user);

        if (icon != null && !icon.isEmpty()) {
            saveIcon(saved.getId(), icon);
        }

        UserControllerDto.SignupResponse response = new UserControllerDto.SignupResponse();
        response.setId(saved.getId());
        response.setEmail(saved.getEmail());
        return new Response<>(response);
    }

    @Override
    public Response<UserControllerDto.EmailAvailabilityResponse> checkEmailAvailability(UserControllerDto.EmailAvailabilityRequest requestPayload) {
        UserControllerDto.EmailAvailabilityResponse response = new UserControllerDto.EmailAvailabilityResponse();
        response.setAvailable(!userRepository.existsByEmailIgnoreCase(requestPayload.getEmail()));
        return new Response<>(response);
    }

    private void saveIcon(BigInteger userId, MultipartFile icon) {
        String extension = extensionForMimeType(icon.getContentType());

        Path iconsDir = Path.of(applicationProperties.getUpload().getIconsDir());
        try {
            Files.createDirectories(iconsDir);
            icon.transferTo(iconsDir.resolve("icon-" + userId + "." + extension));
        } catch (IOException e) {
            throw new ResponseException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to save icon");
        }
    }

    private static String extensionForMimeType(String mimeType) {
        if (mimeType == null) {
            throw new ResponseException(HttpStatus.BAD_REQUEST, "Icon content type is required");
        }
        return switch (mimeType.toLowerCase()) {
            case "image/png" -> "png";
            case "image/jpeg", "image/jpg" -> "jpg";
            case "image/gif" -> "gif";
            case "image/webp" -> "webp";
            case "image/svg+xml" -> "svg";
            default -> throw new ResponseException(HttpStatus.BAD_REQUEST, "Unsupported icon type: " + mimeType);
        };
    }

}
