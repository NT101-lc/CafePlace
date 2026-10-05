package com.cms.report;

import java.time.LocalDate;

import com.cms.common.ShopTime;
import com.cms.report.dto.ReportSummary;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Revenue reports: owner only (staff should not see the shop's revenue). */
@RestController
@RequestMapping("/api/reports")
@PreAuthorize("hasRole('OWNER')")
public class ReportController {

	private final ReportService service;

	public ReportController(ReportService service) {
		this.service = service;
	}

	/** {@code from} and {@code to} are inclusive dates (yyyy-MM-dd, Vietnam time); default: today. */
	@GetMapping("/summary")
	public ReportSummary summary(
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
		LocalDate end = to == null ? ShopTime.today() : to;
		LocalDate start = from == null ? end : from;
		return service.summary(start, end);
	}

}
