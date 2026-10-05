package com.cms.auth.dto;

import com.cms.auth.Role;

/** Returned by register and login. The frontend stores {@code token} and sends it as a Bearer token. */
public record AuthResponse(String token, long expiresInSeconds, UserInfo user) {

	public record UserInfo(Long id, String username, String fullName, Role role, Long shopId, String shopName) {
	}

}
