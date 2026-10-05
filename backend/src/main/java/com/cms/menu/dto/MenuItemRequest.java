package com.cms.menu.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

/** Body for creating or updating a menu item. */
public record MenuItemRequest(
		@NotBlank(message = "Vui lòng nhập tên món")
		@Size(max = 100, message = "Tên món tối đa 100 ký tự")
		String name,

		@Size(max = 50, message = "Tên nhóm tối đa 50 ký tự")
		String category,

		@NotNull(message = "Vui lòng nhập giá")
		@PositiveOrZero(message = "Giá không được âm")
		@Max(value = 100_000_000, message = "Giá tối đa 100.000.000đ")
		Long price,

		/** Defaults to true when omitted. */
		Boolean available) {
}
