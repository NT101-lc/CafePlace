package com.cms.order;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import com.cms.common.tenant.TenantScopedEntity;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "orders")
public class Order extends TenantScopedEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	/** UUID generated on the device. Unique per shop, so re-sending the same offline order is harmless. */
	@Column(nullable = false, updatable = false)
	private UUID clientId;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private OrderStatus status = OrderStatus.OPEN;

	/** Total in VND. */
	@Column(nullable = false)
	private long totalAmount;

	@Column(length = 255)
	private String note;

	/** Id of the user who created the order. */
	private Long createdBy;

	/** Time the order was created on the device (may be long before the server receives it). */
	@Column(nullable = false, updatable = false)
	private Instant createdAt;

	@CreationTimestamp
	@Column(nullable = false, updatable = false)
	private Instant receivedAt;

	@OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
	private List<OrderItem> items = new ArrayList<>();

	protected Order() {
	}

	public Order(UUID clientId, Instant createdAt, Long createdBy) {
		this.clientId = clientId;
		this.createdAt = createdAt;
		this.createdBy = createdBy;
	}

	/** Adds a line and keeps the total in sync. */
	public void addItem(OrderItem item) {
		item.setOrder(this);
		items.add(item);
		totalAmount += item.getLineTotal();
	}

	public Long getId() {
		return id;
	}

	public UUID getClientId() {
		return clientId;
	}

	public OrderStatus getStatus() {
		return status;
	}

	public void setStatus(OrderStatus status) {
		this.status = status;
	}

	public long getTotalAmount() {
		return totalAmount;
	}

	public String getNote() {
		return note;
	}

	public void setNote(String note) {
		this.note = note;
	}

	public Long getCreatedBy() {
		return createdBy;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

	public Instant getReceivedAt() {
		return receivedAt;
	}

	public List<OrderItem> getItems() {
		return items;
	}

}
