package com.cms.common.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

/** The logged-in user of the current request (from the JWT "sub" claim). */
public final class CurrentUser {

	private CurrentUser() {
	}

	/** User id, or null when there is no JWT (e.g. tests or background work). */
	public static Long id() {
		Authentication auth = SecurityContextHolder.getContext().getAuthentication();
		if (auth instanceof JwtAuthenticationToken jwtAuth) {
			return Long.valueOf(jwtAuth.getToken().getSubject());
		}
		return null;
	}

}
