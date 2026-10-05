package com.cms.common.tenant;

import java.util.Map;

import org.hibernate.cfg.MultiTenancySettings;
import org.hibernate.context.spi.CurrentTenantIdentifierResolver;
import org.springframework.boot.hibernate.autoconfigure.HibernatePropertiesCustomizer;
import org.springframework.stereotype.Component;

/**
 * Tells Hibernate which shop the current session belongs to. Hibernate then adds
 * {@code shop_id = ?} to every query on a {@link TenantScopedEntity} and fills {@code shop_id} on insert.
 */
@Component
public class ShopTenantResolver implements CurrentTenantIdentifierResolver<Long>, HibernatePropertiesCustomizer {

	@Override
	public Long resolveCurrentTenantIdentifier() {
		return TenantContext.currentShopId();
	}

	@Override
	public boolean validateExistingCurrentSessions() {
		return false;
	}

	@Override
	public boolean isRoot(Long tenantId) {
		return tenantId != null && tenantId == TenantContext.SYSTEM;
	}

	@Override
	public void customize(Map<String, Object> hibernateProperties) {
		hibernateProperties.put(MultiTenancySettings.MULTI_TENANT_IDENTIFIER_RESOLVER, this);
	}

}
