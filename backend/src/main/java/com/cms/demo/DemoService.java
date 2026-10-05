package com.cms.demo;

import java.util.List;
import java.util.UUID;

import com.cms.auth.AuthService;
import com.cms.auth.Role;
import com.cms.auth.User;
import com.cms.auth.UserRepository;
import com.cms.auth.dto.AuthResponse;
import com.cms.common.tenant.TenantContext;
import com.cms.menu.MenuItemService;
import com.cms.menu.dto.MenuItemRequest;
import com.cms.shop.Shop;
import com.cms.shop.ShopRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * DEMO MODE (branch "demo" only): one shared demo shop that testers enter without logging in.
 * On startup the shop, its owner and a sample menu are created once; /api/auth/demo then hands out
 * a normal JWT for that owner, so all the usual security and shop isolation keep working.
 */
@Service
@ConditionalOnProperty(name = "app.demo.enabled", havingValue = "true")
public class DemoService {

	static final String USERNAME = "demo";

	private static final Logger log = LoggerFactory.getLogger(DemoService.class);

	/** Category, name, price (VND). Drinks first: categories are ordered by first use. */
	private record SampleItem(String category, String name, long price) {
	}

	private static final List<SampleItem> SAMPLE_MENU = List.of(
			new SampleItem("Cà phê", "Cà phê đen đá", 20_000), new SampleItem("Cà phê", "Cà phê sữa đá", 25_000),
			new SampleItem("Cà phê", "Bạc xỉu", 29_000), new SampleItem("Cà phê", "Cà phê muối", 35_000),
			new SampleItem("Cà phê", "Latte nóng", 45_000), new SampleItem("Cà phê", "Cappuccino", 45_000),
			new SampleItem("Trà", "Trà đào cam sả", 39_000), new SampleItem("Trà", "Trà vải", 39_000),
			new SampleItem("Trà", "Trà sen vàng", 45_000), new SampleItem("Trà", "Trà tắc", 20_000),
			new SampleItem("Đá xay", "Matcha đá xay", 55_000), new SampleItem("Đá xay", "Sô-cô-la đá xay", 55_000),
			new SampleItem("Nước ép & khác", "Nước cam", 35_000), new SampleItem("Nước ép & khác", "Chanh dây", 30_000),
			new SampleItem("Nước ép & khác", "Sữa tươi", 25_000),
			new SampleItem("Bánh", "Bánh mì que", 15_000), new SampleItem("Bánh", "Croissant", 29_000),
			new SampleItem("Bánh", "Bánh tiramisu", 39_000), new SampleItem("Bánh", "Bánh chuối", 25_000));

	private final AuthService authService;

	private final UserRepository userRepository;

	private final ShopRepository shopRepository;

	private final MenuItemService menuItemService;

	private final PasswordEncoder passwordEncoder;

	private final TransactionTemplate tx;

	public DemoService(AuthService authService, UserRepository userRepository, ShopRepository shopRepository,
			MenuItemService menuItemService, PasswordEncoder passwordEncoder, TransactionTemplate tx) {
		this.authService = authService;
		this.userRepository = userRepository;
		this.shopRepository = shopRepository;
		this.menuItemService = menuItemService;
		this.passwordEncoder = passwordEncoder;
		this.tx = tx;
	}

	/** Creates the demo shop on the first start; does nothing if it already exists. */
	@EventListener(ApplicationReadyEvent.class)
	public void seed() {
		Long shopId = TenantContext.callAsSystem(() -> tx.execute(status -> {
			if (userRepository.existsByUsername(USERNAME)) {
				return null;
			}
			Shop shop = shopRepository.save(new Shop("Quán Demo"));
			// Random password nobody knows: the demo owner can only be entered through /api/auth/demo.
			User owner = new User(USERNAME, passwordEncoder.encode(UUID.randomUUID().toString()), "Chủ quán demo",
					Role.OWNER);
			owner.assignShopId(shop.getId());
			userRepository.save(owner);
			return shop.getId();
		}));
		if (shopId == null) {
			return;
		}
		for (SampleItem item : SAMPLE_MENU) {
			TenantContext.callAsShop(shopId,
					() -> menuItemService.create(new MenuItemRequest(item.name(), item.category(), item.price(), true)));
		}
		log.info("Demo shop created (id {}) with {} menu items", shopId, SAMPLE_MENU.size());
	}

	public AuthResponse login() {
		return authService.loginWithoutPassword(USERNAME);
	}

}
