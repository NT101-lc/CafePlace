package com.cms.menu;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.cms.support.ApiTestSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;

class MenuCategoryApiTest extends ApiTestSupport {

	TestShop shop;

	@BeforeEach
	void setUp() throws Exception {
		shop = registerShop();
		createItem(shop.ownerToken(), "Bánh mì que", "Bánh", 19_000);
		createItem(shop.ownerToken(), "Phin sữa đá", "Cà phê", 29_000);
		createItem(shop.ownerToken(), "Trà đào", "Trà", 45_000);
		createItem(shop.ownerToken(), "Nước suối", null, 10_000);
	}

	@Test
	void newCategoriesAreAddedAtTheEnd() throws Exception {
		mockMvc.perform(auth(get("/api/menu-categories"), shop.ownerToken()))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$[0].name").value("Bánh"))
			.andExpect(jsonPath("$[1].name").value("Cà phê"))
			.andExpect(jsonPath("$[2].name").value("Trà"));
	}

	@Test
	void ownerCanReorderAndMenuFollowsTheNewOrder() throws Exception {
		JsonNode categories = categories();
		long banh = categories.get(0).get("id").asLong();
		long caPhe = categories.get(1).get("id").asLong();
		long tra = categories.get(2).get("id").asLong();

		mockMvc.perform(auth(put("/api/menu-categories/order"), shop.ownerToken())
			.content("{\"ids\":[%d,%d,%d]}".formatted(caPhe, tra, banh)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$[0].name").value("Cà phê"))
			.andExpect(jsonPath("$[2].name").value("Bánh"));

		// Items follow the category order; items without a category come last.
		mockMvc.perform(auth(get("/api/menu-items"), shop.ownerToken()))
			.andExpect(jsonPath("$[0].name").value("Phin sữa đá"))
			.andExpect(jsonPath("$[1].name").value("Trà đào"))
			.andExpect(jsonPath("$[2].name").value("Bánh mì que"))
			.andExpect(jsonPath("$[3].name").value("Nước suối"));
	}

	@Test
	void reorderMustContainEveryCategory() throws Exception {
		long first = categories().get(0).get("id").asLong();
		mockMvc.perform(auth(put("/api/menu-categories/order"), shop.ownerToken()).content("{\"ids\":[%d]}".formatted(first)))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("CATEGORY_LIST_MISMATCH"));
	}

	@Test
	void staffCannotReorder() throws Exception {
		String staff = createStaffAndLogin(shop);
		mockMvc.perform(auth(put("/api/menu-categories/order"), staff).content("{\"ids\":[]}"))
			.andExpect(status().isForbidden());
	}

	@Test
	void emptyCategoryIsRemoved() throws Exception {
		long itemId = createItem(shop.ownerToken(), "Bánh su kem", "Bánh ngọt", 29_000).get("id").asLong();
		mockMvc.perform(auth(get("/api/menu-categories"), shop.ownerToken())).andExpect(jsonPath("$.length()").value(4));

		mockMvc.perform(auth(delete("/api/menu-items/" + itemId), shop.ownerToken())).andExpect(status().isNoContent());
		mockMvc.perform(auth(get("/api/menu-categories"), shop.ownerToken())).andExpect(jsonPath("$.length()").value(3));
	}

	private JsonNode categories() throws Exception {
		return jsonMapper.readTree(mockMvc.perform(auth(get("/api/menu-categories"), shop.ownerToken()))
			.andReturn().getResponse().getContentAsString());
	}

}
