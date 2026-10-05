package com.cms.dashboard;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.cms.common.ShopTime;
import com.cms.common.error.AppException;
import com.cms.common.tenant.TenantContext;
import com.cms.dashboard.DashboardRepository.AllTimeSales;
import com.cms.dashboard.DashboardRepository.DailySales;
import com.cms.dashboard.dto.DashboardOverview;
import com.cms.dashboard.dto.DashboardOverview.PeriodStat;
import com.cms.dashboard.dto.RevenueSeries;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Long-range revenue (months, quarters, years). The database returns one row per day with sales;
 * everything else (periods, comparisons, buckets) is plain date arithmetic on those rows.
 */
@Service
public class DashboardService {

	/** 5 years by month, 15 years by quarter... enough for a small shop, and keeps the chart readable. */
	public static final int MAX_BUCKETS = 60;

	private final DashboardRepository repository;

	public DashboardService(DashboardRepository repository) {
		this.repository = repository;
	}

	@Transactional(readOnly = true)
	public DashboardOverview overview() {
		LocalDate today = ShopTime.today();
		LocalDate monthStart = Granularity.MONTH.startOf(today);
		LocalDate quarterStart = Granularity.QUARTER.startOf(today);
		LocalDate yearStart = Granularity.YEAR.startOf(today);

		// Everything compared below starts on or after 1 January last year.
		DailyTotals daily = load(yearStart.minusYears(1), today);

		PeriodStat day = daily.stat(today, today, today.minusDays(1), today.minusDays(1));
		// LocalDate.minusMonths clamps to the end of a shorter month (31/3 → 28/2).
		PeriodStat month = daily.stat(monthStart, today, monthStart.minusMonths(1), today.minusMonths(1));
		PeriodStat quarter = daily.stat(quarterStart, today, quarterStart.minusMonths(3), today.minusMonths(3));
		PeriodStat year = daily.stat(yearStart, today, yearStart.minusYears(1), today.minusYears(1));

		AllTimeSales all = repository.findAllTimeSales();
		DashboardOverview.AllTime allTime = new DashboardOverview.AllTime(
				all.getRevenue() == null ? 0 : all.getRevenue(), all.getOrderCount(),
				all.getFirstOrderAt() == null ? null : ShopTime.dateOf(all.getFirstOrderAt()));

		return new DashboardOverview(today, day, month, quarter, year, allTime);
	}

	/** {@code from}/{@code to} are inclusive dates and are widened to whole buckets. */
	@Transactional(readOnly = true)
	public RevenueSeries revenue(Granularity groupBy, LocalDate from, LocalDate to) {
		if (to.isBefore(from)) {
			throw new AppException(HttpStatus.BAD_REQUEST, "INVALID_RANGE", "Ngày bắt đầu phải trước ngày kết thúc");
		}
		LocalDate start = groupBy.startOf(from);
		LocalDate end = groupBy.next(groupBy.startOf(to)); // exclusive
		if (ChronoUnit.MONTHS.between(start, end) / groupBy.months() > MAX_BUCKETS) {
			throw new AppException(HttpStatus.BAD_REQUEST, "INVALID_RANGE",
					"Khoảng thời gian quá dài, chỉ xem được tối đa " + MAX_BUCKETS + " cột");
		}
		LocalDate today = ShopTime.today();
		DailyTotals daily = load(start.minusYears(1), end.minusDays(1));

		List<RevenueSeries.Bucket> buckets = new ArrayList<>();
		long revenue = 0, orders = 0, previousRevenue = 0, previousOrders = 0;
		for (LocalDate bucketStart = start; bucketStart.isBefore(end); bucketStart = groupBy.next(bucketStart)) {
			LocalDate bucketEnd = groupBy.next(bucketStart).minusDays(1);
			boolean started = !bucketStart.isAfter(today);
			boolean inProgress = started && !bucketEnd.isBefore(today);
			long[] current = daily.sum(bucketStart, bucketEnd);
			// A bucket in progress (1–5/10) is compared with the same days last year (1–5/10), not the whole month.
			LocalDate compareEnd = inProgress ? today : bucketEnd;
			long[] lastYear = daily.sum(bucketStart.minusYears(1), compareEnd.minusYears(1));
			buckets.add(new RevenueSeries.Bucket(bucketStart, bucketEnd, current[0], current[1], lastYear[0],
					lastYear[1], inProgress));
			revenue += current[0];
			orders += current[1];
			// Future buckets have no revenue yet: leave them out of the comparison total too.
			if (started) {
				previousRevenue += lastYear[0];
				previousOrders += lastYear[1];
			}
		}
		return new RevenueSeries(groupBy, start, end.minusDays(1), revenue, orders, previousRevenue, previousOrders,
				buckets);
	}

	/** Loads paid revenue per day for the inclusive range [from, to] of the current shop. */
	private DailyTotals load(LocalDate from, LocalDate to) {
		List<DailySales> rows = repository.findDailySales(TenantContext.currentShopId(), ShopTime.startOf(from),
				ShopTime.startOf(to.plusDays(1)));
		Map<LocalDate, long[]> byDay = new HashMap<>();
		for (DailySales row : rows) {
			byDay.put(row.getDay(), new long[] { row.getRevenue(), row.getOrderCount() });
		}
		return new DailyTotals(byDay);
	}

	/** Revenue and order count per day; days without sales are simply missing. */
	private record DailyTotals(Map<LocalDate, long[]> byDay) {

		/** [revenue, orderCount] summed over the inclusive range. */
		long[] sum(LocalDate from, LocalDate to) {
			long[] total = new long[2];
			for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
				long[] day = byDay.get(d);
				if (day != null) {
					total[0] += day[0];
					total[1] += day[1];
				}
			}
			return total;
		}

		PeriodStat stat(LocalDate from, LocalDate to, LocalDate previousFrom, LocalDate previousTo) {
			long[] current = sum(from, to);
			long[] previous = sum(previousFrom, previousTo);
			return new PeriodStat(from, to, current[0], current[1], previousFrom, previousTo, previous[0], previous[1]);
		}

	}

}
