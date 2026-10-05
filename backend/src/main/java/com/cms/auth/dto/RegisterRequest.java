package com.cms.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
		@NotBlank(message = "Vui lòng nhập tên quán")
		@Size(max = 150, message = "Tên quán tối đa 150 ký tự")
		String shopName,

		@NotBlank(message = "Vui lòng nhập họ tên")
		@Size(max = 100, message = "Họ tên tối đa 100 ký tự")
		String fullName,

		@NotBlank(message = "Vui lòng nhập tên đăng nhập")
		@Size(min = 3, max = 50, message = "Tên đăng nhập dài từ 3 đến 50 ký tự")
		@Pattern(regexp = "^[a-zA-Z0-9._]*$", message = "Tên đăng nhập chỉ gồm chữ không dấu, số, dấu chấm và gạch dưới")
		String username,

		@NotBlank(message = "Vui lòng nhập mật khẩu")
		// BCrypt only uses the first 72 bytes.
		@Size(min = 8, max = 72, message = "Mật khẩu dài từ 8 đến 72 ký tự")
		String password) {
}
