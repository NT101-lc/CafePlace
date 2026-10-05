package com.cms.dashboard.dto;

import java.time.LocalDate;

/**
 * Headline numbers for the dashboard. Month, quarter and year are "to date" and compared with the same
 * number of days at the start of the previous period (1–5/10 vs 1–5/9), so a half-finished month is not
 * compared with a whole one. Today is compared with the whole of yesterday.
 */
public record DashboardOverview(LocalDate date, PeriodStat today, PeriodStat month, PeriodStat quarter,
		PeriodStat year, AllTime allTime) {

	/** Inclusive dates, Vietnam time. */
	public record PeriodStat(LocalDate from, LocalDate to, long revenue, long orderCount, LocalDate previousFrom,
			LocalDate previousTo, long previousRevenue, long previousOrderCount) {
	}

	/** {@code firstOrderDate} is null when the shop has no paid order yet. */
	public record AllTime(long revenue, long orderCount, LocalDate firstOrderDate) {
	}

}
