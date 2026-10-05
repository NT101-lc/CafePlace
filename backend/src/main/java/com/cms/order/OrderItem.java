package com.cms.order;

import com.cms.common.tenant.TenantScopedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/** One line of an order. Name and price are copied from the menu so later menu edits do not change old orders. */
@Entity
@Table(name = "order_items")
public class OrderItem extends TenantScopedEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "order_id", nullable = false)
	private Order order;

	/** May be null if the menu item was deleted later. */
	private Long menuItemId;

	@Column(nullable = false, length = 100)
	private String itemName;

	/** Unit price in VND at the time of sale. */
	@Column(nullable = false)
	private long unitPrice;

	@Column(nullable = false)
	private int quantity;

	protected OrderItem() {
	}

	public OrderItem(Long menuItemId, String itemName, long unitPrice, int quantity) {
		this.menuItemId = menuItemId;
		this.itemName = itemName;
		this.unitPrice = unitPrice;
		this.quantity = quantity;
	}

	public long getLineTotal() {
		return unitPrice * quantity;
	}

	public Long getId() {
		return id;
	}

	public Order getOrder() {
		return order;
	}

	void setOrder(Order order) {
		this.order = order;
	}

	public Long getMenuItemId() {
		return menuItemId;
	}

	public String getItemName() {
		return itemName;
	}

	public long getUnitPrice() {
		return unitPrice;
	}

	public int getQuantity() {
		return quantity;
	}

}
