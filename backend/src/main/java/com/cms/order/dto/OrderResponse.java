package com.cms.order.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.cms.order.Order;
import com.cms.order.OrderItem;
import com.cms.order.OrderStatus;
import com.cms.order.PaymentMethod;

public record OrderResponse(Long id, UUID clientId, OrderStatus status, PaymentMethod paymentMethod, long totalAmount,
		String note, Instant createdAt, Instant receivedAt, Instant cancelledAt, List<Line> items) {

	public record Line(Long menuItemId, String itemName, long unitPrice, int quantity) {

		static Line from(OrderItem item) {
			return new Line(item.getMenuItemId(), item.getItemName(), item.getUnitPrice(), item.getQuantity());
		}

	}

	public static OrderResponse from(Order order) {
		return new OrderResponse(order.getId(), order.getClientId(), order.getStatus(), order.getPaymentMethod(),
				order.getTotalAmount(), order.getNote(), order.getCreatedAt(), order.getReceivedAt(),
				order.getCancelledAt(), order.getItems().stream().map(Line::from).toList());
	}

}
