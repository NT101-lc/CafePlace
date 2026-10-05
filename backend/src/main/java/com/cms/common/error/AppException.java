package com.cms.common.error;

import org.springframework.http.HttpStatus;

/**
 * Throw this from business code for any error the user should see.
 * {@link GlobalExceptionHandler} turns it into an {@link ApiError} response.
 */
public class AppException extends RuntimeException {

	private final HttpStatus status;

	private final String code;

	public AppException(HttpStatus status, String code, String message) {
		super(message);
		this.status = status;
		this.code = code;
	}

	public static AppException notFound(String message) {
		return new AppException(HttpStatus.NOT_FOUND, "NOT_FOUND", message);
	}

	public static AppException conflict(String code, String message) {
		return new AppException(HttpStatus.CONFLICT, code, message);
	}

	public HttpStatus getStatus() {
		return status;
	}

	public String getCode() {
		return code;
	}

}
