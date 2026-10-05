package com.cms.dashboard;

import java.time.LocalDate;

import com.cms.common.ShopTime;
import com.cms.dashboard.dto.DashboardOverview;
import com.cms.dashboard.dto.RevenueSeries;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Revenue dashboard: owner only (staff should not see the shop's revenue). */
@RestController
@RequestMapping("/api/dashboard")
@PreAuthorize("hasRole('OWNER')")
public class DashboardController {

	private final DashboardService service;

	public DashboardController(DashboardService service) {
		this.service = service;
	}

	/** Today, this month, quarter and year (to date) with comparisons, plus all-time totals. */
	@GetMapping("/overview")
	public DashboardOverview overview() {
		return service.overview();
	}

	/**
	 * Revenue per month / quarter / year. {@code from} and {@code to} (yyyy-MM-dd) are widened to whole
	 * buckets; default: the last 12 months, 8 quarters or 5 years up to today.
	 */
	@GetMapping("/revenue")
	public RevenueSeries revenue(@RequestParam(defaultValue = "MONTH") Granularity groupBy,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
		LocalDate end = to == null ? ShopTime.today() : to;
		LocalDate start = from == null ? groupBy.defaultFrom(end) : from;
		return service.revenue(groupBy, start, end);
	}

}
