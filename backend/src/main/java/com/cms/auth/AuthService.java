package com.cms.auth;

import java.util.Locale;

import com.cms.auth.dto.AuthResponse;
import com.cms.auth.dto.LoginRequest;
import com.cms.auth.dto.RegisterRequest;
import com.cms.common.error.AppException;
import com.cms.common.tenant.TenantContext;
import com.cms.shop.Shop;
import com.cms.shop.ShopRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Registration and login. Both run before the caller has a JWT, so they use
 * {@link TenantContext#callAsSystem} (no shop filter) and open the transaction inside it
 * with {@link TransactionTemplate} — Hibernate picks the shop when the transaction starts.
 */
@Service
public class AuthService {

	private final UserRepository userRepository;

	private final ShopRepository shopRepository;

	private final PasswordEncoder passwordEncoder;

	private final JwtService jwtService;

	private final TransactionTemplate tx;

	public AuthService(UserRepository userRepository, ShopRepository shopRepository,
			PasswordEncoder passwordEncoder, JwtService jwtService, TransactionTemplate tx) {
		this.userRepository = userRepository;
		this.shopRepository = shopRepository;
		this.passwordEncoder = passwordEncoder;
		this.jwtService = jwtService;
		this.tx = tx;
	}

	/** Creates a new shop and its owner account in one transaction, then logs the owner in. */
	public AuthResponse register(RegisterRequest request) {
		String username = normalize(request.username());
		return TenantContext.callAsSystem(() -> tx.execute(status -> {
			if (userRepository.existsByUsername(username)) {
				throw AppException.conflict("USERNAME_TAKEN", "Tên đăng nhập đã được sử dụng");
			}
			Shop shop = shopRepository.save(new Shop(request.shopName().trim()));
			User owner = new User(username, passwordEncoder.encode(request.password()),
					request.fullName().trim(), Role.OWNER);
			owner.assignShopId(shop.getId());
			userRepository.save(owner);
			return toResponse(owner, shop);
		}));
	}

	public AuthResponse login(LoginRequest request) {
		String username = normalize(request.username());
		return TenantContext.callAsSystem(() -> tx.execute(status -> {
			User user = userRepository.findByUsername(username)
				.filter(u -> u.isActive() && passwordEncoder.matches(request.password(), u.getPasswordHash()))
				.orElseThrow(() -> new AppException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS",
						"Tên đăng nhập hoặc mật khẩu không đúng"));
			Shop shop = shopRepository.findById(user.getShopId()).orElseThrow();
			return toResponse(user, shop);
		}));
	}

	private AuthResponse toResponse(User user, Shop shop) {
		var info = new AuthResponse.UserInfo(user.getId(), user.getUsername(), user.getFullName(), user.getRole(),
				shop.getId(), shop.getName());
		return new AuthResponse(jwtService.issueToken(user), jwtService.ttlSeconds(), info);
	}

	private static String normalize(String username) {
		return username.trim().toLowerCase(Locale.ROOT);
	}

}
