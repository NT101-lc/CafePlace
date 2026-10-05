package com.cms.dashboard;

import java.time.LocalDate;

/** How the revenue chart groups days: calendar months, quarters (Q1 = Jan–Mar) or years. */
public enum Granularity {

	MONTH(1), QUARTER(3), YEAR(12);

	private final int months;

	Granularity(int months) {
		this.months = months;
	}

	/** First day of the month / quarter / year that contains {@code date}. */
	public LocalDate startOf(LocalDate date) {
		return switch (this) {
			case MONTH -> date.withDayOfMonth(1);
			case QUARTER -> LocalDate.of(date.getYear(), (date.getMonthValue() - 1) / 3 * 3 + 1, 1);
			case YEAR -> date.withDayOfYear(1);
		};
	}

	/** Length of one bucket in months. */
	public int months() {
		return months;
	}

	/** First day of the next bucket, given the first day of a bucket. */
	public LocalDate next(LocalDate bucketStart) {
		return bucketStart.plusMonths(months);
	}

	/** Default range when the client does not choose one: last 12 months, 8 quarters or 5 years. */
	public LocalDate defaultFrom(LocalDate to) {
		return switch (this) {
			case MONTH -> to.minusMonths(11);
			case QUARTER -> to.minusMonths(21);
			case YEAR -> to.minusYears(4);
		};
	}

}
