package com.cms.menu;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Arrays;

import com.cms.support.ApiTestSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import tools.jackson.databind.JsonNode;

/** Upload, serve and delete menu item images. Uses the real RustFS bucket "cms-media-test". */
class MenuImageApiTest extends ApiTestSupport {

	/** Only the first bytes matter for type detection. */
	static final byte[] PNG = { (byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 1, 2, 3, 4 };

	static final byte[] WEBP = { 'R', 'I', 'F', 'F', 0, 0, 0, 0, 'W', 'E', 'B', 'P', 'V', 'P', '8', ' ' };

	TestShop shop;

	long itemId;

	@BeforeEach
	void setUp() throws Exception {
		shop = registerShop();
		itemId = createItem(shop.ownerToken(), "Phin sữa đá", "Cà phê", 29_000).get("id").asLong();
	}

	@Test
	void uploadServeReplaceAndRemove() throws Exception {
		String firstUrl = upload(shop.ownerToken(), PNG).get("imageUrl").asString();

		// Public, cacheable, same bytes back.
		mockMvc.perform(get(firstUrl))
			.andExpect(status().isOk())
			.andExpect(header().string("Content-Type", "image/png"))
			.andExpect(header().string("Cache-Control", org.hamcrest.Matchers.containsString("immutable")))
			.andExpect(content().bytes(PNG));

		// Replacing gives a new URL and deletes the old file.
		String secondUrl = upload(shop.ownerToken(), WEBP).get("imageUrl").asString();
		org.assertj.core.api.Assertions.assertThat(secondUrl).isNotEqualTo(firstUrl).endsWith(".webp");
		mockMvc.perform(get(firstUrl)).andExpect(status().isNotFound());

		mockMvc.perform(auth(delete("/api/menu-items/" + itemId + "/image"), shop.ownerToken()))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.imageUrl").doesNotExist());
		mockMvc.perform(get(secondUrl)).andExpect(status().isNotFound());
	}

	@Test
	void rejectsNonImagesAndHugeFiles() throws Exception {
		mockMvc.perform(imagePut(shop.ownerToken(), "hello".getBytes()))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("INVALID_IMAGE"));

		byte[] huge = Arrays.copyOf(PNG, MenuImageService.MAX_BYTES + 10);
		mockMvc.perform(imagePut(shop.ownerToken(), huge))
			.andExpect(status().isPayloadTooLarge())
			.andExpect(jsonPath("$.code").value("IMAGE_TOO_LARGE"));
	}

	@Test
	void onlyTheOwnerOfThisShopCanUpload() throws Exception {
		mockMvc.perform(imagePut(registerShop().ownerToken(), PNG)).andExpect(status().isNotFound());
		mockMvc.perform(imagePut(createStaffAndLogin(shop), PNG)).andExpect(status().isForbidden());
	}

	@Test
	void unknownOrMalformedMediaPathsAre404() throws Exception {
		mockMvc.perform(get("/api/media/menu/1/00000000-0000-0000-0000-000000000000.webp"))
			.andExpect(status().isNotFound());
		mockMvc.perform(get("/api/media/menu/1/..%2F..%2Fsecret.txt")).andExpect(status().is4xxClientError());
	}

	private JsonNode upload(String token, byte[] data) throws Exception {
		return jsonMapper.readTree(mockMvc.perform(imagePut(token, data))
			.andExpect(status().isOk())
			.andReturn().getResponse().getContentAsString());
	}

	private MockHttpServletRequestBuilder imagePut(String token, byte[] data) {
		return put("/api/menu-items/" + itemId + "/image")
			.header("Authorization", "Bearer " + token)
			.contentType("image/png")
			.content(data);
	}

}
