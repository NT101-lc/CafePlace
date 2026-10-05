package com.cms.order;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Every query here is automatically limited to the current shop. */
public interface OrderRepository extends JpaRepository<Order, Long> {

	/** Used by offline sync to detect an order that was already received. */
	@EntityGraph(attributePaths = "items")
	Optional<Order> findByClientId(UUID clientId);

	/** Orders created in [from, to), newest first, with their lines loaded in the same query. */
	@EntityGraph(attributePaths = "items")
	List<Order> findByCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtDesc(Instant from, Instant to);

	/** One row per order, without lines: enough for revenue reports. */
	interface SaleRow {

		Instant getCreatedAt();

		long getTotalAmount();

		PaymentMethod getPaymentMethod();

	}

	@Query("""
			select o.createdAt as createdAt, o.totalAmount as totalAmount, o.paymentMethod as paymentMethod
			from Order o
			where o.status = :status and o.createdAt >= :from and o.createdAt < :to
			""")
	List<SaleRow> findSales(@Param("status") OrderStatus status, @Param("from") Instant from, @Param("to") Instant to);

	long countByStatusAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(OrderStatus status, Instant from, Instant to);

}
