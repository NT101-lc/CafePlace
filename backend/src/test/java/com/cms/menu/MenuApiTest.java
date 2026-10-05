package com.cms.menu;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.cms.support.ApiTestSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class MenuApiTest extends ApiTestSupport {

	TestShop shop;

	@BeforeEach
	void setUp() throws Exception {
		shop = registerShop();
	}

	@Test
	void ownerCanCreateListUpdateAndDelete() throws Exception {
		long id = createItem(shop.ownerToken(), "Cà phê sữa đá", "Cà phê", 25_000).get("id").asLong();

		mockMvc.perform(auth(get("/api/menu-items"), shop.ownerToken()))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.length()").value(1))
			.andExpect(jsonPath("$[0].name").value("Cà phê sữa đá"))
			.andExpect(jsonPath("$[0].category").value("Cà phê"))
			.andExpect(jsonPath("$[0].available").value(true))
			.andExpect(jsonPath("$[0].imageUrl").doesNotExist());

		mockMvc.perform(auth(put("/api/menu-items/" + id), shop.ownerToken())
			.content(itemJson("Cà phê sữa", "  ", 27_000)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.price").value(27_000))
			// Blank category is stored as "no category".
			.andExpect(jsonPath("$.category").doesNotExist());

		mockMvc.perform(auth(delete("/api/menu-items/" + id), shop.ownerToken())).andExpect(status().isNoContent());
		mockMvc.perform(auth(get("/api/menu-items"), shop.ownerToken())).andExpect(jsonPath("$.length()").value(0));
	}

	@Test
	void staffCanReadAndToggleAvailabilityButNotEdit() throws Exception {
		long id = createItem(shop.ownerToken(), "Bạc xỉu", "Cà phê", 30_000).get("id").asLong();
		String staffToken = createStaffAndLogin(shop);

		mockMvc.perform(auth(get("/api/menu-items"), staffToken)).andExpect(status().isOk());

		mockMvc.perform(auth(patch("/api/menu-items/" + id + "/availability"), staffToken)
			.content("{\"available\":false}"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.available").value(false));

		mockMvc.perform(auth(post("/api/menu-items"), staffToken).content(itemJson("Trà đá", null, 5_000)))
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("FORBIDDEN"));
		mockMvc.perform(auth(delete("/api/menu-items/" + id), staffToken)).andExpect(status().isForbidden());
	}

	@Test
	void otherShopGetsNotFound() throws Exception {
		long id = createItem(shop.ownerToken(), "Trà đào", "Trà", 35_000).get("id").asLong();
		String otherOwner = registerShop().ownerToken();

		mockMvc.perform(auth(put("/api/menu-items/" + id), otherOwner).content(itemJson("Hacked", null, 1)))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.message").value("Không tìm thấy món"));
		mockMvc.perform(auth(delete("/api/menu-items/" + id), otherOwner)).andExpect(status().isNotFound());
		mockMvc.perform(auth(get("/api/menu-items"), otherOwner)).andExpect(jsonPath("$.length()").value(0));
		// Same category name in another shop is a different category.
		mockMvc.perform(auth(get("/api/menu-categories"), otherOwner)).andExpect(jsonPath("$.length()").value(0));
	}

	@Test
	void invalidInputIsRejected() throws Exception {
		mockMvc.perform(auth(post("/api/menu-items"), shop.ownerToken()).content(itemJson("", null, -1)))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.fields.name").value("Vui lòng nhập tên món"))
			.andExpect(jsonPath("$.fields.price").value("Giá không được âm"));

		mockMvc.perform(auth(put("/api/menu-items/abc"), shop.ownerToken()).content(itemJson("Trà", null, 1)))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("BAD_REQUEST"));
	}

}
