package com.cms.demo;

import com.cms.auth.dto.AuthResponse;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

/** DEMO MODE: log in to the shared demo shop without a password. Absent (404) when demo mode is off. */
@RestController
@ConditionalOnProperty(name = "app.demo.enabled", havingValue = "true")
public class DemoController {

	private final DemoService service;

	public DemoController(DemoService service) {
		this.service = service;
	}

	@PostMapping("/api/auth/demo")
	public AuthResponse login() {
		return service.login();
	}

}
