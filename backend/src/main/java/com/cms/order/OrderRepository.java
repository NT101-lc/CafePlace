package com.cms.order;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

/** Every query here is automatically limited to the current shop. */
public interface OrderRepository extends JpaRepository<Order, Long> {

	/** Used by offline sync to detect an order that was already received. */
	Optional<Order> findByClientId(UUID clientId);

}
