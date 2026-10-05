package com.cms.report.dto;

import java.time.LocalDate;
import java.util.List;

import com.cms.order.PaymentMethod;

/**
 * Sales summary of paid orders between {@code from} and {@code to} (inclusive, Vietnam time).
 * Cancelled orders are only counted in {@code cancelledCount}.
 */
public record ReportSummary(LocalDate from, LocalDate to, long revenue, long orderCount, long averageOrderValue,
		long cancelledCount, List<Day> days, List<Hour> hours, List<Payment> paymentMethods, List<TopItem> topItems) {

	/** Every day of the range is present, with zeros when nothing was sold. */
	public record Day(LocalDate date, long revenue, long orderCount) {
	}

	/** 24 entries, hour 0..23 (Vietnam time), summed over the whole range. */
	public record Hour(int hour, long revenue, long orderCount) {
	}

	public record Payment(PaymentMethod method, long revenue, long orderCount) {
	}

	public record TopItem(String name, long quantity, long revenue) {
	}

}
