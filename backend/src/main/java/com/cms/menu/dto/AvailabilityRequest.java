package com.cms.menu.dto;

import jakarta.validation.constraints.NotNull;

/** Body for marking an item as sold out / available again. */
public record AvailabilityRequest(
		@NotNull(message = "Thiếu trạng thái còn/hết món")
		Boolean available) {
}
