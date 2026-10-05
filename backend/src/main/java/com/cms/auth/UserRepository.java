package com.cms.auth;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {

	/** Filtered by the current shop like every query. Login calls it inside TenantContext.callAsSystem. */
	Optional<User> findByUsername(String username);

	boolean existsByUsername(String username);

}
