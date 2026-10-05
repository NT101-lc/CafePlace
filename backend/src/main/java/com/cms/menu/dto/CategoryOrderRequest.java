package com.cms.menu.dto;

import java.util.List;

import jakarta.validation.constraints.NotNull;

/** All category ids of the shop, in the new display order (first = shown first). */
public record CategoryOrderRequest(
		@NotNull(message = "Thiếu danh sách nhóm")
		List<@NotNull Long> ids) {
}
