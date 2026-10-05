package com.cms.common.tenant;

import jakarta.persistence.Column;
import jakarta.persistence.MappedSuperclass;
import org.hibernate.annotations.TenantId;

/**
 * Base class for every entity that belongs to a shop. Extending it is all you need:
 * Hibernate filters reads by the current shop and sets {@code shop_id} on insert.
 */
@MappedSuperclass
public abstract class TenantScopedEntity {

	@TenantId
	@Column(name = "shop_id", nullable = false, updatable = false)
	private Long shopId;

	public Long getShopId() {
		return shopId;
	}

	/**
	 * Only needed inside {@link TenantContext#callAsSystem}, where there is no current shop
	 * (e.g. creating the owner of a brand-new shop). Elsewhere Hibernate fills it, and assigning
	 * a different shop than the current one throws an exception.
	 */
	public void assignShopId(Long shopId) {
		this.shopId = shopId;
	}

}
