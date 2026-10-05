package com.cms.common;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

/**
 * All shops are in Vietnam: "today", daily lists and reports use Vietnam time (UTC+7).
 * If shops in other time zones are ever supported, move this to a per-shop setting.
 */
public final class ShopTime {

	public static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

	private ShopTime() {
	}

	public static LocalDate today() {
		return LocalDate.now(ZONE);
	}

	/** Start of {@code date} (00:00 Vietnam time). */
	public static Instant startOf(LocalDate date) {
		return date.atStartOfDay(ZONE).toInstant();
	}

	public static LocalDate dateOf(Instant instant) {
		return instant.atZone(ZONE).toLocalDate();
	}

	public static int hourOf(Instant instant) {
		return instant.atZone(ZONE).getHour();
	}

}
