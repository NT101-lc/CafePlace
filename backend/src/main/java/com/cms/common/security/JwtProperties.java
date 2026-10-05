package com.cms.common.security;

import java.nio.charset.StandardCharsets;
import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * {@code app.jwt.*} settings.
 *
 * @param secret HMAC key, at least 32 bytes (env {@code JWT_SECRET})
 * @param ttl    token lifetime (env {@code JWT_TTL}, e.g. {@code 7d})
 */
@ConfigurationProperties("app.jwt")
public record JwtProperties(String secret, Duration ttl) {

	public JwtProperties {
		if (secret == null || secret.getBytes(StandardCharsets.UTF_8).length < 32) {
			throw new IllegalStateException("JWT_SECRET must be set and at least 32 bytes long");
		}
	}

}
