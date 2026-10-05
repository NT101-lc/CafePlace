package com.cms.common;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** Liveness check used by Docker / Caddy and for quick manual checks. */
@RestController
public class HealthController {

	private final JdbcTemplate jdbcTemplate;

	public HealthController(JdbcTemplate jdbcTemplate) {
		this.jdbcTemplate = jdbcTemplate;
	}

	@GetMapping("/api/health")
	public ResponseEntity<Map<String, String>> health() {
		try {
			jdbcTemplate.queryForObject("SELECT 1", Integer.class);
			return ResponseEntity.ok(Map.of("status", "UP", "database", "UP"));
		}
		catch (RuntimeException ex) {
			return ResponseEntity.status(503).body(Map.of("status", "DOWN", "database", "DOWN"));
		}
	}

}
