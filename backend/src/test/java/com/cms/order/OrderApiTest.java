package com.cms.order;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

import com.cms.support.ApiTestSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;

class OrderApiTest extends ApiTestSupport {

	TestShop shop;

	long coffeeId;

	@BeforeEach
	void setUp() throws Exception {
		shop = registerShop();
		coffeeId = createItem(shop.ownerToken(), "Bạc xỉu", "Cà phê", 30_000).get("id").asLong();
	}

	@Test
	void syncCreatesPaidOrderAndIsIdempotent() throws Exception {
		String body = orderJson(UUID.randomUUID(), Instant.now(), "TRANSFER", coffeeId);

		String first = mockMvc.perform(auth(post("/api/orders/sync"), shop.ownerToken()).content(body))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.status").value("PAID"))
			.andExpect(jsonPath("$.paymentMethod").value("TRANSFER"))
			.andExpect(jsonPath("$.totalAmount").value(2 * 30_000 + 19_000))
			.andExpect(jsonPath("$.items.length()").value(2))
			.andExpect(jsonPath("$.items[0].menuItemId").value(coffeeId))
			.andReturn().getResponse().getContentAsString();

		// The device retries (e.g. the first response was lost): same order, not a new one.
		mockMvc.perform(auth(post("/api/orders/sync"), shop.ownerToken()).content(body))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.id").value(jsonMapper.readTree(first).get("id").asLong()));

		mockMvc.perform(auth(get("/api/orders"), shop.ownerToken()))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.length()").value(1));
	}

	@Test
	void menuItemOfAnotherShopIsNotLinked() throws Exception {
		TestShop other = registerShop();
		long foreignItem = createItem(other.ownerToken(), "Món quán khác", null, 1_000).get("id").asLong();

		mockMvc.perform(auth(post("/api/orders/sync"), shop.ownerToken())
			.content(orderJson(UUID.randomUUID(), Instant.now(), "CASH", foreignItem)))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.items[0].menuItemId").doesNotExist())
			// The name/price snapshot is still kept.
			.andExpect(jsonPath("$.items[0].itemName").value("Bạc xỉu"));
	}

	@Test
	void futureTimeFromWrongDeviceClockIsClamped() throws Exception {
		Instant tomorrow = Instant.now().plus(Duration.ofDays(1));
		String body = mockMvc.perform(auth(post("/api/orders/sync"), shop.ownerToken())
			.content(orderJson(UUID.randomUUID(), tomorrow, "CASH", coffeeId)))
			.andExpect(status().isCreated())
			.andReturn().getResponse().getContentAsString();
		Instant stored = Instant.parse(jsonMapper.readTree(body).get("createdAt").asString());
		assertThat(stored).isBefore(Instant.now().plus(Duration.ofMinutes(1)));
	}

	@Test
	void invalidOrdersAreRejected() throws Exception {
		mockMvc.perform(auth(post("/api/orders/sync"), shop.ownerToken()).content("""
				{"clientId":"%s","createdAt":"%s","paymentMethod":"CASH","items":[]}
				""".formatted(UUID.randomUUID(), Instant.now())))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.fields.items").value("Đơn hàng chưa có món nào"));

		mockMvc.perform(auth(post("/api/orders/sync"), shop.ownerToken()).content("""
				{"clientId":"%s","createdAt":"%s","paymentMethod":"CASH",
				 "items":[{"itemName":"Trà","unitPrice":5000,"quantity":0}]}
				""".formatted(UUID.randomUUID(), Instant.now())))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.fields['items[0].quantity']").value("Số lượng phải từ 1"));
	}

	@Test
	void onlyOwnerCanCancelAndOnlyInOwnShop() throws Exception {
		long orderId = sync(shop.ownerToken(), Instant.now()).get("id").asLong();

		mockMvc.perform(auth(post("/api/orders/" + orderId + "/cancel"), createStaffAndLogin(shop)))
			.andExpect(status().isForbidden());
		mockMvc.perform(auth(post("/api/orders/" + orderId + "/cancel"), registerShop().ownerToken()))
			.andExpect(status().isNotFound());

		mockMvc.perform(auth(post("/api/orders/" + orderId + "/cancel"), shop.ownerToken()))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.status").value("CANCELLED"))
			.andExpect(jsonPath("$.cancelledAt").exists());
		// Cancelling again is harmless.
		mockMvc.perform(auth(post("/api/orders/" + orderId + "/cancel"), shop.ownerToken()))
			.andExpect(status().isOk());
	}

	@Test
	void staffCanSellAndSeeTodaysOrders() throws Exception {
		String staff = createStaffAndLogin(shop);
		sync(staff, Instant.now());
		mockMvc.perform(auth(get("/api/orders"), staff)).andExpect(jsonPath("$.length()").value(1));
		// Another shop sees nothing.
		mockMvc.perform(auth(get("/api/orders"), registerShop().ownerToken())).andExpect(jsonPath("$.length()").value(0));
	}

	private JsonNode sync(String token, Instant createdAt) throws Exception {
		return jsonMapper.readTree(mockMvc
			.perform(auth(post("/api/orders/sync"), token).content(orderJson(UUID.randomUUID(), createdAt, "CASH", coffeeId)))
			.andExpect(status().isCreated())
			.andReturn().getResponse().getContentAsString());
	}

	/** 2 x Bạc xỉu (30.000) linked to {@code menuItemId} + 1 x Bánh mì que (19.000) without link. */
	static String orderJson(UUID clientId, Instant createdAt, String payment, long menuItemId) {
		return """
				{"clientId":"%s","createdAt":"%s","paymentMethod":"%s","note":"ít đá",
				 "items":[{"menuItemId":%d,"itemName":"Bạc xỉu","unitPrice":30000,"quantity":2},
				          {"itemName":"Bánh mì que","unitPrice":19000,"quantity":1}]}
				""".formatted(clientId, createdAt, payment, menuItemId);
	}

}
