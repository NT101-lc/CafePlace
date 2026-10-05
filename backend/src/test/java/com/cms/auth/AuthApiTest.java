package com.cms.auth;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/** Register/login happy paths and the unified JSON error format. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthApiTest {

	@Autowired
	MockMvc mockMvc;

	@Test
	void registerThenLogin() throws Exception {
		String username = uniqueUsername();
		mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
			.content(registerJson(username)))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.token").isNotEmpty())
			.andExpect(jsonPath("$.user.role").value("OWNER"))
			.andExpect(jsonPath("$.user.shopName").value("Quán Test"));

		mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
			.content("{\"username\":\"" + username.toUpperCase() + "\",\"password\":\"matkhau123\"}"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.token").isNotEmpty())
			.andExpect(jsonPath("$.user.username").value(username));
	}

	@Test
	void duplicateUsernameReturnsConflict() throws Exception {
		String username = uniqueUsername();
		mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
			.content(registerJson(username))).andExpect(status().isCreated());

		mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
			.content(registerJson(username)))
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("USERNAME_TAKEN"))
			.andExpect(jsonPath("$.message").value("Tên đăng nhập đã được sử dụng"));
	}

	@Test
	void wrongPasswordReturnsUnauthorized() throws Exception {
		mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
			.content("{\"username\":\"khong_ton_tai\",\"password\":\"sai\"}"))
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
	}

	@Test
	void invalidInputReturnsFieldErrors() throws Exception {
		mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
			.content("{\"shopName\":\"\",\"fullName\":\"A\",\"username\":\"abc\",\"password\":\"123\"}"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
			.andExpect(jsonPath("$.fields.shopName").value("Vui lòng nhập tên quán"))
			.andExpect(jsonPath("$.fields.password").exists());
	}

	@Test
	void protectedEndpointWithoutTokenReturnsJson401() throws Exception {
		mockMvc.perform(get("/api/menu-items"))
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
	}

	@Test
	void healthIsPublic() throws Exception {
		mockMvc.perform(get("/api/health"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.status").value("UP"));
	}

	private static String uniqueUsername() {
		return "u" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
	}

	private static String registerJson(String username) {
		return """
				{"shopName":"Quán Test","fullName":"Chủ quán","username":"%s","password":"matkhau123"}
				""".formatted(username);
	}

}
