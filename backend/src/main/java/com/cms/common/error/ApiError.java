package com.cms.common.error;

import java.util.Map;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * The one JSON shape for every error response.
 *
 * @param code    stable, machine-readable code for the frontend (e.g. {@code VALIDATION_ERROR})
 * @param message Vietnamese message that can be shown to the user as-is
 * @param fields  per-field messages for validation errors, otherwise omitted
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiError(String code, String message, Map<String, String> fields) {

	public ApiError(String code, String message) {
		this(code, message, null);
	}

}
