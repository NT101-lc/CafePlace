package com.cms.report;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import com.cms.common.ShopTime;
import com.cms.common.error.AppException;
import com.cms.order.OrderItemRepository;
import com.cms.order.OrderRepository;
import com.cms.order.OrderStatus;
import com.cms.order.PaymentMethod;
import com.cms.report.dto.ReportSummary;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Sales reports. Small shops have at most a few thousand orders per month, so orders are loaded as
 * light rows (time, total, payment) and grouped in Java: simple to read and test, no SQL time-zone tricks.
 * All queries are JPQL, so they are automatically limited to the current shop.
 */
@Service
public class ReportService {

	public static final int MAX_DAYS = 92;

	private static final int TOP_ITEMS = 10;

	private final OrderRepository orderRepository;

	private final OrderItemRepository orderItemRepository;

	public ReportService(OrderRepository orderRepository, OrderItemRepository orderItemRepository) {
		this.orderRepository = orderRepository;
		this.orderItemRepository = orderItemRepository;
	}

	@Transactional(readOnly = true)
	public ReportSummary summary(LocalDate from, LocalDate to) {
		if (to.isBefore(from)) {
			throw new AppException(HttpStatus.BAD_REQUEST, "INVALID_RANGE", "Ngày bắt đầu phải trước ngày kết thúc");
		}
		if (ChronoUnit.DAYS.between(from, to) + 1 > MAX_DAYS) {
			throw new AppException(HttpStatus.BAD_REQUEST, "INVALID_RANGE", "Chỉ xem được tối đa " + MAX_DAYS + " ngày");
		}
		Instant start = ShopTime.startOf(from);
		Instant end = ShopTime.startOf(to.plusDays(1));

		Map<LocalDate, long[]> byDay = new LinkedHashMap<>(); // [revenue, orders]
		for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
			byDay.put(d, new long[2]);
		}
		long[][] byHour = new long[24][2];
		Map<PaymentMethod, long[]> byPayment = new EnumMap<>(PaymentMethod.class);
		Arrays.stream(PaymentMethod.values()).forEach(m -> byPayment.put(m, new long[2]));
		long revenue = 0;
		long orders = 0;

		for (OrderRepository.SaleRow sale : orderRepository.findSales(OrderStatus.PAID, start, end)) {
			long amount = sale.getTotalAmount();
			revenue += amount;
			orders++;
			add(byDay.get(ShopTime.dateOf(sale.getCreatedAt())), amount);
			add(byHour[ShopTime.hourOf(sale.getCreatedAt())], amount);
			add(byPayment.get(sale.getPaymentMethod()), amount);
		}

		List<ReportSummary.Day> days = new ArrayList<>();
		byDay.forEach((date, v) -> days.add(new ReportSummary.Day(date, v[0], v[1])));
		List<ReportSummary.Hour> hours = new ArrayList<>();
		for (int h = 0; h < 24; h++) {
			hours.add(new ReportSummary.Hour(h, byHour[h][0], byHour[h][1]));
		}
		List<ReportSummary.Payment> payments = new ArrayList<>();
		byPayment.forEach((method, v) -> payments.add(new ReportSummary.Payment(method, v[0], v[1])));
		List<ReportSummary.TopItem> topItems = orderItemRepository
			.findTopItems(start, end, PageRequest.ofSize(TOP_ITEMS))
			.stream()
			.map(i -> new ReportSummary.TopItem(i.getItemName(), i.getQuantity(), i.getRevenue()))
			.toList();
		long cancelled = orderRepository.countByStatusAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(
				OrderStatus.CANCELLED, start, end);

		return new ReportSummary(from, to, revenue, orders, orders == 0 ? 0 : Math.round((double) revenue / orders),
				cancelled, days, hours, payments, topItems);
	}

	private static void add(long[] bucket, long amount) {
		bucket[0] += amount;
		bucket[1]++;
	}

}
