package com.cms.order;

import java.time.LocalDate;
import java.util.List;

import com.cms.common.ShopTime;
import com.cms.common.error.AppException;
import com.cms.order.dto.OrderResponse;
import com.cms.order.dto.OrderSyncRequest;
import jakarta.validation.Valid;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

	private final OrderService service;

	public OrderController(OrderService service) {
		this.service = service;
	}

	/**
	 * Receives an order from a device (online or after being offline). 201 when created, 200 when this
	 * clientId was already received. Either way the device can delete its local copy.
	 */
	@PostMapping("/sync")
	public ResponseEntity<OrderResponse> sync(@Valid @RequestBody OrderSyncRequest request) {
		OrderService.SyncResult result;
		try {
			result = service.sync(request);
		}
		catch (DataIntegrityViolationException ex) {
			// Two copies of the same order arrived at the same time: the other one won, return it.
			OrderResponse stored = service.findByClientId(request.clientId()).orElseThrow(() -> ex);
			return ResponseEntity.ok(stored);
		}
		return ResponseEntity.status(result.created() ? HttpStatus.CREATED : HttpStatus.OK).body(result.order());
	}

	/** Orders of one day (Vietnam time), default today. */
	@GetMapping
	public List<OrderResponse> list(@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
		LocalDate day = date == null ? ShopTime.today() : date;
		if (day.isAfter(ShopTime.today().plusDays(1))) {
			throw new AppException(HttpStatus.BAD_REQUEST, "BAD_REQUEST", "Ngày không hợp lệ");
		}
		return service.listForDay(day);
	}

	@PostMapping("/{id}/cancel")
	@PreAuthorize("hasRole('OWNER')")
	public OrderResponse cancel(@PathVariable Long id) {
		return service.cancel(id);
	}

}
