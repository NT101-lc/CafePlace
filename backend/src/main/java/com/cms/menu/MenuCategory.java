package com.cms.menu;

import java.time.Instant;

import com.cms.common.tenant.TenantScopedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;

/**
 * A menu group such as "Cà phê" or "Bánh". Created automatically the first time an item uses a new
 * name, removed automatically when its last item leaves. The owner chooses the display order.
 */
@Entity
@Table(name = "menu_categories")
public class MenuCategory extends TenantScopedEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false, length = 50)
	private String name;

	/** 0 = shown first. */
	@Column(nullable = false)
	private int sortOrder;

	@CreationTimestamp
	@Column(nullable = false, updatable = false)
	private Instant createdAt;

	protected MenuCategory() {
	}

	public MenuCategory(String name, int sortOrder) {
		this.name = name;
		this.sortOrder = sortOrder;
	}

	public Long getId() {
		return id;
	}

	public String getName() {
		return name;
	}

	public int getSortOrder() {
		return sortOrder;
	}

	public void setSortOrder(int sortOrder) {
		this.sortOrder = sortOrder;
	}

}
