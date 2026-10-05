package com.cms.report;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.OffsetDateTime;
import java.util.UUID;

import com.cms.support.ApiTestSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** Report numbers, including the Vietnam-time day boundary (UTC+7). */
class ReportApiTest extends ApiTestSupport {

	TestShop shop;

	@BeforeEach
	void setUp() throws Exception {
		shop = registerShop();
		// 10/03, 23:30 Vietnam time = 16:30 UTC → belongs to 10/03.
		order("2026-03-10T23:30:00+07:00", "CASH", "Bạc xỉu", 25_000, 2);
		// 11/03, 00:15 Vietnam time = 10/03 17:15 UTC → belongs to 11/03.
		order("2026-03-11T00:15:00+07:00", "TRANSFER", "Trà đào", 30_000, 1);
		// Cancelled orders do not count as revenue.
		String cancelledId = order("2026-03-10T09:00:00+07:00", "CASH", "Bạc xỉu", 99_000, 1);
		mockMvc.perform(auth(post("/api/orders/" + cancelledId + "/cancel"), shop.ownerToken()))
			.andExpect(status().isOk());
	}

	@Test
	void singleDayUsesVietnamTime() throws Exception {
		mockMvc.perform(auth(get("/api/reports/summary?from=2026-03-10&to=2026-03-10"), shop.ownerToken()))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.revenue").value(50_000))
			.andExpect(jsonPath("$.orderCount").value(1))
			.andExpect(jsonPath("$.averageOrderValue").value(50_000))
			.andExpect(jsonPath("$.cancelledCount").value(1))
			.andExpect(jsonPath("$.days.length()").value(1))
			.andExpect(jsonPath("$.hours[23].orderCount").value(1))
			.andExpect(jsonPath("$.paymentMethods[?(@.method=='CASH')].revenue").value(50_000))
			.andExpect(jsonPath("$.topItems[0].name").value("Bạc xỉu"))
			.andExpect(jsonPath("$.topItems[0].quantity").value(2));
	}

	@Test
	void rangeFillsEveryDay() throws Exception {
		mockMvc.perform(auth(get("/api/reports/summary?from=2026-03-09&to=2026-03-11"), shop.ownerToken()))
			.andExpect(jsonPath("$.revenue").value(80_000))
			.andExpect(jsonPath("$.orderCount").value(2))
			.andExpect(jsonPath("$.days.length()").value(3))
			.andExpect(jsonPath("$.days[0].revenue").value(0))
			.andExpect(jsonPath("$.days[2].date").value("2026-03-11"))
			.andExpect(jsonPath("$.days[2].revenue").value(30_000))
			.andExpect(jsonPath("$.hours[0].orderCount").value(1))
			.andExpect(jsonPath("$.paymentMethods[?(@.method=='TRANSFER')].orderCount").value(1));
	}

	@Test
	void rejectsBadRangesAndStaff() throws Exception {
		mockMvc.perform(auth(get("/api/reports/summary?from=2026-03-11&to=2026-03-10"), shop.ownerToken()))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("INVALID_RANGE"));
		mockMvc.perform(auth(get("/api/reports/summary?from=2026-01-01&to=2026-06-01"), shop.ownerToken()))
			.andExpect(status().isBadRequest());
		mockMvc.perform(auth(get("/api/reports/summary"), createStaffAndLogin(shop))).andExpect(status().isForbidden());
	}

	@Test
	void otherShopSeesNothing() throws Exception {
		mockMvc.perform(auth(get("/api/reports/summary?from=2026-03-10&to=2026-03-11"), registerShop().ownerToken()))
			.andExpect(jsonPath("$.revenue").value(0))
			.andExpect(jsonPath("$.topItems.length()").value(0));
	}

	/** Creates a paid order and returns its id. */
	private String order(String createdAt, String payment, String name, long price, int quantity) throws Exception {
		String body = """
				{"clientId":"%s","createdAt":"%s","paymentMethod":"%s",
				 "items":[{"itemName":"%s","unitPrice":%d,"quantity":%d}]}
				""".formatted(UUID.randomUUID(), OffsetDateTime.parse(createdAt).toInstant(), payment, name, price, quantity);
		String response = mockMvc.perform(auth(post("/api/orders/sync"), shop.ownerToken()).content(body))
			.andExpect(status().isCreated())
			.andReturn().getResponse().getContentAsString();
		return jsonMapper.readTree(response).get("id").asString();
	}

}
