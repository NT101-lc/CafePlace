package com.cms.order.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.cms.order.PaymentMethod;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

/**
 * An order created on a device (maybe offline). Prices come from the device because they are what the
 * customer actually paid, even if the menu price changed before the order reached the server.
 */
public record OrderSyncRequest(
		@NotNull(message = "Thiếu mã đơn")
		UUID clientId,

		@NotNull(message = "Thiếu thời gian tạo đơn")
		Instant createdAt,

		@NotNull(message = "Vui lòng chọn hình thức thanh toán")
		PaymentMethod paymentMethod,

		@Size(max = 255, message = "Ghi chú tối đa 255 ký tự")
		String note,

		@NotEmpty(message = "Đơn hàng chưa có món nào")
		@Size(max = 100, message = "Một đơn tối đa 100 dòng")
		List<@Valid @NotNull Line> items) {

	public record Line(
			/** null if the item is not on the menu any more. */
			Long menuItemId,

			@NotBlank(message = "Thiếu tên món")
			@Size(max = 100, message = "Tên món tối đa 100 ký tự")
			String itemName,

			@NotNull(message = "Thiếu giá")
			@PositiveOrZero(message = "Giá không được âm")
			@Max(value = 100_000_000, message = "Giá không hợp lệ")
			Long unitPrice,

			@NotNull(message = "Thiếu số lượng")
			@Min(value = 1, message = "Số lượng phải từ 1")
			@Max(value = 999, message = "Số lượng tối đa 999")
			Integer quantity) {
	}

}
