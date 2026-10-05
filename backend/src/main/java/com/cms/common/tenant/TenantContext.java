package com.cms.common.tenant;

import java.util.function.Supplier;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Single source of truth for "which shop is the current request working for".
 *
 * <p>Normally the shop comes from the {@code shop_id} claim of the JWT. Code that runs without a JWT
 * (registration, login, background jobs, tests) can override it with {@link #callAsShop} or
 * {@link #callAsSystem}.
 *
 * <p>Hibernate reads the shop once, when a session opens (= when a transaction starts). That is why
 * the override methods must be called <b>outside</b> any transaction.
 */
public final class TenantContext {

	/** Claim name in the JWT that holds the shop id. */
	public static final String CLAIM_SHOP_ID = "shop_id";

	/** Used when no shop is known. No shop has this id, so queries return nothing and inserts fail. */
	public static final long NO_SHOP = 0L;

	/**
	 * "Root" tenant: queries are NOT filtered and entities may be saved with an explicit shop id.
	 * Only for the few places that legitimately work across shops (registration, login).
	 */
	public static final long SYSTEM = -1L;

	private static final ThreadLocal<Long> OVERRIDE = new ThreadLocal<>();

	private TenantContext() {
	}

	/** The shop the current code is working for, or {@link #NO_SHOP}. */
	public static long currentShopId() {
		Long override = OVERRIDE.get();
		if (override != null) {
			return override;
		}
		Authentication auth = SecurityContextHolder.getContext().getAuthentication();
		if (auth instanceof JwtAuthenticationToken jwtAuth
				&& jwtAuth.getToken().getClaim(CLAIM_SHOP_ID) instanceof Number shopId) {
			return shopId.longValue();
		}
		return NO_SHOP;
	}

	/** Run {@code action} as the given shop (e.g. background jobs, tests). */
	public static <T> T callAsShop(long shopId, Supplier<T> action) {
		return callWith(shopId, action);
	}

	/** Run {@code action} without shop filtering. Use sparingly and only in auth/admin code. */
	public static <T> T callAsSystem(Supplier<T> action) {
		return callWith(SYSTEM, action);
	}

	private static <T> T callWith(long shopId, Supplier<T> action) {
		if (TransactionSynchronizationManager.isActualTransactionActive()) {
			throw new IllegalStateException(
					"TenantContext overrides must be used outside a transaction: Hibernate fixes the shop when the session opens");
		}
		Long previous = OVERRIDE.get();
		OVERRIDE.set(shopId);
		try {
			return action.get();
		}
		finally {
			if (previous == null) {
				OVERRIDE.remove();
			}
			else {
				OVERRIDE.set(previous);
			}
		}
	}

}
