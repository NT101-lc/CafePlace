package com.cms.order;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import com.cms.common.ShopTime;
import com.cms.common.error.AppException;
import com.cms.common.security.CurrentUser;
import com.cms.menu.MenuItem;
import com.cms.menu.MenuItemRepository;
import com.cms.order.dto.OrderResponse;
import com.cms.order.dto.OrderSyncRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/** Orders. All repository calls are already limited to the current shop. */
@Service
public class OrderService {

	/** Device clocks can be a bit ahead; anything later than this is treated as "now". */
	private static final Duration MAX_CLOCK_SKEW = Duration.ofMinutes(5);

	private final OrderRepository orderRepository;

	private final MenuItemRepository menuItemRepository;

	public OrderService(OrderRepository orderRepository, MenuItemRepository menuItemRepository) {
		this.orderRepository = orderRepository;
		this.menuItemRepository = menuItemRepository;
	}

	/** Result of a sync: the stored order and whether this call created it. */
	public record SyncResult(OrderResponse order, boolean created) {
	}

	/**
	 * Stores an order created on a device. Sending the same clientId again returns the stored order
	 * instead of creating a duplicate, so the device can safely retry after a lost response.
	 */
	@Transactional
	public SyncResult sync(OrderSyncRequest request) {
		Optional<Order> existing = orderRepository.findByClientId(request.clientId());
		if (existing.isPresent()) {
			return new SyncResult(OrderResponse.from(existing.get()), false);
		}

		Instant now = Instant.now();
		Instant createdAt = request.createdAt().isAfter(now.plus(MAX_CLOCK_SKEW)) ? now : request.createdAt();
		Order order = new Order(request.clientId(), createdAt, CurrentUser.id());
		order.setNote(StringUtils.hasText(request.note()) ? request.note().trim() : null);

		// Keep the link to the menu only for items that still exist in THIS shop.
		Set<Long> existingMenuIds = menuItemIdsOf(request.items());
		for (OrderSyncRequest.Line line : request.items()) {
			Long requested = line.menuItemId();
			Long menuItemId = requested != null && existingMenuIds.contains(requested) ? requested : null;
			order.addItem(new OrderItem(menuItemId, line.itemName().trim(), line.unitPrice(), line.quantity()));
		}
		order.markPaid(request.paymentMethod());
		return new SyncResult(OrderResponse.from(orderRepository.saveAndFlush(order)), true);
	}

	@Transactional(readOnly = true)
	public Optional<OrderResponse> findByClientId(UUID clientId) {
		return orderRepository.findByClientId(clientId).map(OrderResponse::from);
	}

	/** Orders created on {@code date} (Vietnam time), newest first. */
	@Transactional(readOnly = true)
	public List<OrderResponse> listForDay(LocalDate date) {
		return orderRepository
			.findByCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtDesc(ShopTime.startOf(date),
					ShopTime.startOf(date.plusDays(1)))
			.stream()
			.map(OrderResponse::from)
			.toList();
	}

	/** Cancelling twice is harmless: the second call just returns the cancelled order. */
	@Transactional
	public OrderResponse cancel(Long id) {
		Order order = orderRepository.findById(id).orElseThrow(() -> AppException.notFound("Không tìm thấy đơn"));
		if (order.getStatus() != OrderStatus.CANCELLED) {
			order.cancel(Instant.now());
		}
		return OrderResponse.from(orderRepository.saveAndFlush(order));
	}

	private Set<Long> menuItemIdsOf(List<OrderSyncRequest.Line> lines) {
		Set<Long> requested = lines.stream()
			.map(OrderSyncRequest.Line::menuItemId)
			.filter(java.util.Objects::nonNull)
			.collect(Collectors.toSet());
		if (requested.isEmpty()) {
			return Set.of();
		}
		return new HashSet<>(menuItemRepository.findAllById(requested).stream().map(MenuItem::getId).toList());
	}

}
