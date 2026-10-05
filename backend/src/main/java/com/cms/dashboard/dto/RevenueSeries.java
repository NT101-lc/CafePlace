package com.cms.dashboard.dto;

import java.time.LocalDate;
import java.util.List;

import com.cms.dashboard.Granularity;

/**
 * Paid revenue grouped by month, quarter or year. {@code from}/{@code to} are widened to whole buckets.
 * "previousYear" values are the same calendar bucket one year earlier (same period last year); for the
 * bucket in progress only the same days last year (1–5/10/2025 for 1–5/10/2026). The previous-year
 * totals leave out buckets that have not started yet.
 */
public record RevenueSeries(Granularity groupBy, LocalDate from, LocalDate to, long revenue, long orderCount,
		long previousYearRevenue, long previousYearOrderCount, List<Bucket> buckets) {

	/** {@code start}/{@code end} are inclusive; {@code inProgress} is true for the bucket that contains today. */
	public record Bucket(LocalDate start, LocalDate end, long revenue, long orderCount, long previousYearRevenue,
			long previousYearOrderCount, boolean inProgress) {
	}

}
