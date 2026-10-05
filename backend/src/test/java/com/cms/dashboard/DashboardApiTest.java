package com.cms.dashboard;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

import com.cms.common.ShopTime;
import com.cms.support.ApiTestSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** Revenue by month / quarter / year, the Vietnam-time month boundary, and shop isolation. */
class DashboardApiTest extends ApiTestSupport {

	TestShop shop;

	@BeforeEach
	void setUp() throws Exception {
		shop = registerShop();
		order(at("2025-03-15T10:00:00+07:00"), 40_000);
		order(at("2026-03-10T09:00:00+07:00"), 50_000);
		// 31/03 23:30 Vietnam time is still March (16:30 UTC).
		order(at("2026-03-31T23:30:00+07:00"), 30_000);
		// 01/04 00:15 Vietnam time is April, although it is still 31/03 in UTC.
		order(at("2026-04-01T00:15:00+07:00"), 20_000);
		// Cancelled orders are not revenue.
		String cancelledId = order(at("2026-03-12T09:00:00+07:00"), 99_000);
		mockMvc.perform(auth(post("/api/orders/" + cancelledId + "/cancel"), shop.ownerToken()))
			.andExpect(status().isOk());
	}

	@Test
	void groupsByMonthWithSamePeriodLastYear() throws Exception {
		mockMvc.perform(auth(get("/api/dashboard/revenue?groupBy=MONTH&from=2026-03-05&to=2026-04-02"),
				shop.ownerToken()))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.from").value("2026-03-01"))
			.andExpect(jsonPath("$.to").value("2026-04-30"))
			.andExpect(jsonPath("$.revenue").value(100_000))
			.andExpect(jsonPath("$.orderCount").value(3))
			.andExpect(jsonPath("$.previousYearRevenue").value(40_000))
			.andExpect(jsonPath("$.buckets.length()").value(2))
			.andExpect(jsonPath("$.buckets[0].end").value("2026-03-31"))
			.andExpect(jsonPath("$.buckets[0].revenue").value(80_000))
			.andExpect(jsonPath("$.buckets[0].orderCount").value(2))
			.andExpect(jsonPath("$.buckets[0].previousYearRevenue").value(40_000))
			.andExpect(jsonPath("$.buckets[0].inProgress").value(false))
			.andExpect(jsonPath("$.buckets[1].revenue").value(20_000));
	}

	@Test
	void groupsByQuarterAndYear() throws Exception {
		mockMvc.perform(auth(get("/api/dashboard/revenue?groupBy=QUARTER&from=2026-01-01&to=2026-06-30"),
				shop.ownerToken()))
			.andExpect(jsonPath("$.buckets.length()").value(2))
			.andExpect(jsonPath("$.buckets[0].revenue").value(80_000))
			.andExpect(jsonPath("$.buckets[1].start").value("2026-04-01"))
			.andExpect(jsonPath("$.buckets[1].revenue").value(20_000));

		mockMvc.perform(auth(get("/api/dashboard/revenue?groupBy=YEAR&from=2025-06-01&to=2026-01-01"),
				shop.ownerToken()))
			.andExpect(jsonPath("$.from").value("2025-01-01"))
			.andExpect(jsonPath("$.buckets.length()").value(2))
			.andExpect(jsonPath("$.buckets[0].revenue").value(40_000))
			.andExpect(jsonPath("$.buckets[1].revenue").value(100_000))
			.andExpect(jsonPath("$.buckets[1].previousYearRevenue").value(40_000));
	}

	@Test
	void overviewCountsTodayAndAllTime() throws Exception {
		order(Instant.now(), 15_000);
		mockMvc.perform(auth(get("/api/dashboard/overview"), shop.ownerToken()))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.date").value(ShopTime.today().toString()))
			.andExpect(jsonPath("$.today.revenue").value(15_000))
			.andExpect(jsonPath("$.today.orderCount").value(1))
			.andExpect(jsonPath("$.month.revenue").value(15_000))
			.andExpect(jsonPath("$.year.from").value(ShopTime.today().withDayOfYear(1).toString()))
			.andExpect(jsonPath("$.allTime.revenue").value(155_000))
			.andExpect(jsonPath("$.allTime.orderCount").value(5))
			.andExpect(jsonPath("$.allTime.firstOrderDate").value("2025-03-15"));
	}

	/** This month so far is compared with the same days last year, not with the whole month. */
	@Test
	void monthInProgressComparesSameDaysLastYear() throws Exception {
		LocalDate today = ShopTime.today();
		order(ShopTime.startOf(today.minusYears(1)).plusSeconds(3600), 10_000);
		LocalDate laterLastYear = today.plusDays(1).minusYears(1);
		boolean sameMonth = laterLastYear.getMonth() == today.minusYears(1).getMonth();
		if (sameMonth) {
			order(ShopTime.startOf(laterLastYear).plusSeconds(3600), 70_000); // after "today" last year: not compared
		}
		mockMvc.perform(auth(get("/api/dashboard/revenue?groupBy=MONTH&from=" + today + "&to=" + today),
				shop.ownerToken()))
			.andExpect(jsonPath("$.buckets.length()").value(1))
			.andExpect(jsonPath("$.buckets[0].inProgress").value(true))
			.andExpect(jsonPath("$.buckets[0].previousYearRevenue").value(10_000))
			.andExpect(jsonPath("$.previousYearRevenue").value(10_000));
	}

	@Test
	void rejectsBadRequestsAndStaff() throws Exception {
		mockMvc.perform(auth(get("/api/dashboard/revenue?groupBy=WEEK"), shop.ownerToken()))
			.andExpect(status().isBadRequest());
		mockMvc.perform(auth(get("/api/dashboard/revenue?from=2026-05-01&to=2026-04-01"), shop.ownerToken()))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("INVALID_RANGE"));
		mockMvc.perform(auth(get("/api/dashboard/revenue?groupBy=MONTH&from=2020-01-01&to=2026-12-31"),
				shop.ownerToken()))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("INVALID_RANGE"));
		String staff = createStaffAndLogin(shop);
		mockMvc.perform(auth(get("/api/dashboard/overview"), staff)).andExpect(status().isForbidden());
		mockMvc.perform(auth(get("/api/dashboard/revenue"), staff)).andExpect(status().isForbidden());
	}

	/** The daily query is native SQL (not filtered by Hibernate): make sure it filters by shop itself. */
	@Test
	void otherShopSeesNothing() throws Exception {
		String other = registerShop().ownerToken();
		mockMvc.perform(auth(get("/api/dashboard/revenue?groupBy=YEAR&from=2025-01-01&to=2026-12-31"), other))
			.andExpect(jsonPath("$.revenue").value(0))
			.andExpect(jsonPath("$.previousYearRevenue").value(0));
		mockMvc.perform(auth(get("/api/dashboard/overview"), other))
			.andExpect(jsonPath("$.allTime.revenue").value(0))
			.andExpect(jsonPath("$.allTime.firstOrderDate").doesNotExist());
	}

	private static Instant at(String vietnamTime) {
		return OffsetDateTime.parse(vietnamTime).toInstant();
	}

	/** Creates a paid one-line order and returns its id. */
	private String order(Instant createdAt, long price) throws Exception {
		String body = """
				{"clientId":"%s","createdAt":"%s","paymentMethod":"CASH",
				 "items":[{"itemName":"Cà phê sữa","unitPrice":%d,"quantity":1}]}
				""".formatted(UUID.randomUUID(), createdAt, price);
		String response = mockMvc.perform(auth(post("/api/orders/sync"), shop.ownerToken()).content(body))
			.andExpect(status().isCreated())
			.andReturn().getResponse().getContentAsString();
		return jsonMapper.readTree(response).get("id").asString();
	}

}
