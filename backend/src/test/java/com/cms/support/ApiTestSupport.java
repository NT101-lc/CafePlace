package com.cms.support;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import com.cms.auth.Role;
import com.cms.auth.User;
import com.cms.auth.UserRepository;
import com.cms.common.tenant.TenantContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Base class for API integration tests: real database, real RustFS, requests through MockMvc.
 * Every test registers its own shops with random usernames, so tests never depend on each other.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public abstract class ApiTestSupport {

	protected static final String PASSWORD = "matkhau123";

	@Autowired
	protected MockMvc mockMvc;

	@Autowired
	protected JsonMapper jsonMapper;

	@Autowired
	private UserRepository userRepository;

	@Autowired
	private PasswordEncoder passwordEncoder;

	/** A freshly registered shop and its owner's token. */
	protected record TestShop(long shopId, String ownerToken) {
	}

	protected TestShop registerShop() throws Exception {
		String body = mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
			.content("{\"shopName\":\"Quán Test\",\"fullName\":\"Chủ\",\"username\":\"%s\",\"password\":\"%s\"}"
				.formatted(uniqueUsername(), PASSWORD)))
			.andExpect(status().isCreated())
			.andReturn().getResponse().getContentAsString();
		JsonNode auth = jsonMapper.readTree(body);
		return new TestShop(auth.get("user").get("shopId").asLong(), auth.get("token").asString());
	}

	/** Creates a STAFF user in {@code shop} and returns their token. */
	protected String createStaffAndLogin(TestShop shop) throws Exception {
		String username = uniqueUsername();
		TenantContext.callAsShop(shop.shopId(),
				() -> userRepository.save(new User(username, passwordEncoder.encode(PASSWORD), "Nhân viên", Role.STAFF)));
		String body = mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
			.content("{\"username\":\"%s\",\"password\":\"%s\"}".formatted(username, PASSWORD)))
			.andExpect(status().isOk())
			.andReturn().getResponse().getContentAsString();
		return jsonMapper.readTree(body).get("token").asString();
	}

	/** Creates a menu item and returns the response JSON. */
	protected JsonNode createItem(String token, String name, String category, long price) throws Exception {
		String body = mockMvc.perform(auth(post("/api/menu-items"), token).content(itemJson(name, category, price)))
			.andExpect(status().isCreated())
			.andReturn().getResponse().getContentAsString();
		return jsonMapper.readTree(body);
	}

	protected String itemJson(String name, String category, long price) {
		return jsonMapper.writeValueAsString(new ItemBody(name, category, price));
	}

	private record ItemBody(String name, String category, long price) {
	}

	/** Adds the Bearer token and a JSON content type. */
	protected static MockHttpServletRequestBuilder auth(MockHttpServletRequestBuilder request, String token) {
		return request.header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON);
	}

	protected static String uniqueUsername() {
		return "u" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
	}

}
