package com.cms;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.function.Supplier;

import com.cms.menu.MenuItem;
import com.cms.menu.MenuItemRepository;
import com.cms.order.Order;
import com.cms.order.OrderItem;
import com.cms.order.OrderRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.json.JsonMapper;

/**
 * Proves that shop B cannot read shop A's data.
 *
 * <p>Two shops are registered through the real API. Repository calls are then made with each
 * shop's real JWT in the SecurityContext — exactly what happens during an HTTP request — so the
 * whole chain JWT claim → TenantContext → Hibernate filter is exercised.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class TenantIsolationTest {

	@Autowired
	MockMvc mockMvc;

	@Autowired
	JsonMapper jsonMapper;

	@Autowired
	JwtDecoder jwtDecoder;

	@Autowired
	MenuItemRepository menuItemRepository;

	@Autowired
	OrderRepository orderRepository;

	String tokenA;

	String tokenB;

	@BeforeEach
	void registerTwoShops() throws Exception {
		tokenA = register("Quán A");
		tokenB = register("Quán B");
	}

	@AfterEach
	void clearSecurityContext() {
		SecurityContextHolder.clearContext();
	}

	@Test
	void shopBCannotReadShopAMenuItems() {
		Long itemId = asShop(tokenA, () -> menuItemRepository.save(new MenuItem("Cà phê sữa đá", null, 25_000)))
			.getId();

		// Shop A sees its own item.
		assertThat(asShop(tokenA, () -> menuItemRepository.findById(itemId))).isPresent();

		// Shop B sees neither the item by id nor in a list.
		assertThat(asShop(tokenB, () -> menuItemRepository.findById(itemId))).isEmpty();
		assertThat(asShop(tokenB, () -> menuItemRepository.findAll())).extracting(MenuItem::getId)
			.doesNotContain(itemId);

		// Without a token nothing is visible at all.
		assertThat(menuItemRepository.findById(itemId)).isEmpty();
	}

	@Test
	void shopBCannotReadShopAOrders() {
		UUID clientId = UUID.randomUUID();
		Long orderId = asShop(tokenA, () -> {
			Order order = new Order(clientId, Instant.now(), null);
			order.addItem(new OrderItem(null, "Bạc xỉu", 30_000, 2));
			return orderRepository.save(order);
		}).getId();

		assertThat(asShop(tokenA, () -> orderRepository.findByClientId(clientId))).isPresent();

		assertThat(asShop(tokenB, () -> orderRepository.findById(orderId))).isEmpty();
		assertThat(asShop(tokenB, () -> orderRepository.findByClientId(clientId))).isEmpty();
		assertThat(asShop(tokenB, () -> orderRepository.findAll())).extracting(Order::getId).doesNotContain(orderId);
	}

	@Test
	void sameClientIdIsAllowedInDifferentShops() {
		UUID clientId = UUID.randomUUID();
		asShop(tokenA, () -> orderRepository.save(new Order(clientId, Instant.now(), null)));
		asShop(tokenB, () -> orderRepository.save(new Order(clientId, Instant.now(), null)));

		// ...but not twice in the same shop: this is what makes offline re-sync idempotent.
		assertThatThrownBy(() -> asShop(tokenA, () -> orderRepository.save(new Order(clientId, Instant.now(), null))))
			.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void savingWithoutTokenIsRejected() {
		// No shop in context → shop_id 0 → foreign key violation instead of a row with a wrong shop.
		assertThatThrownBy(() -> menuItemRepository.save(new MenuItem("Trà đá", null, 5_000)))
			.isInstanceOf(DataIntegrityViolationException.class);
	}

	/** Runs {@code action} as if it were inside an HTTP request authenticated with {@code token}. */
	private <T> T asShop(String token, Supplier<T> action) {
		SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(jwtDecoder.decode(token)));
		try {
			return action.get();
		}
		finally {
			SecurityContextHolder.clearContext();
		}
	}

	private String register(String shopName) throws Exception {
		String username = "u" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
		String body = jsonMapper.writeValueAsString(
				Map.of("shopName", shopName, "fullName", "Chủ quán", "username", username, "password", "matkhau123"));
		String response = mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(body))
			.andExpect(status().isCreated())
			.andReturn()
			.getResponse()
			.getContentAsString();
		return jsonMapper.readTree(response).get("token").asString();
	}

}
