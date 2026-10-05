package com.cms.auth;

import java.time.Instant;

import com.cms.common.security.JwtProperties;
import com.cms.common.security.SecurityConfig;
import com.cms.common.tenant.TenantContext;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

/** Issues access tokens. Verification is done by Spring Security (see SecurityConfig). */
@Service
public class JwtService {

	private final JwtEncoder encoder;

	private final JwtProperties props;

	public JwtService(JwtEncoder encoder, JwtProperties props) {
		this.encoder = encoder;
		this.props = props;
	}

	public String issueToken(User user) {
		Instant now = Instant.now();
		JwtClaimsSet claims = JwtClaimsSet.builder()
			.subject(String.valueOf(user.getId()))
			.issuedAt(now)
			.expiresAt(now.plus(props.ttl()))
			.claim(TenantContext.CLAIM_SHOP_ID, user.getShopId())
			.claim(SecurityConfig.CLAIM_ROLE, user.getRole().name())
			.build();
		JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
		return encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
	}

	public long ttlSeconds() {
		return props.ttl().toSeconds();
	}

}
