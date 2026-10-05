package com.cms.demo;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.cms.support.ApiTestSupport;
import org.junit.jupiter.api.Test;

/** Demo mode: a shared demo shop with a sample menu, entered without a password. */
class DemoApiTest extends ApiTestSupport {

	@Test
	void demoLoginGivesOwnerOfSeededShop() throws Exception {
		String body = mockMvc.perform(post("/api/auth/demo"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.token").isNotEmpty())
			.andExpect(jsonPath("$.user.username").value("demo"))
			.andExpect(jsonPath("$.user.role").value("OWNER"))
			.andExpect(jsonPath("$.user.shopName").value("Quán Demo"))
			.andReturn().getResponse().getContentAsString();
		String token = jsonMapper.readTree(body).get("token").asString();

		mockMvc.perform(auth(get("/api/menu-items"), token))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$[0].category").value("Cà phê"));
	}

	@Test
	void demoShopStaysIsolatedFromOtherShops() throws Exception {
		// A normal shop does not see the demo menu.
		mockMvc.perform(auth(get("/api/menu-items"), registerShop().ownerToken()))
			.andExpect(jsonPath("$.length()").value(0));
	}

	@Test
	void demoAccountCannotBeEnteredWithAGuessedPassword() throws Exception {
		mockMvc.perform(post("/api/auth/login").contentType("application/json")
			.content("{\"username\":\"demo\",\"password\":\"demo\"}"))
			.andExpect(status().isUnauthorized());
	}

}
