package com.cms.order;

import java.time.Instant;
import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Every query here is automatically limited to the current shop. */
public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {

	/** Quantity and revenue per item name. */
	interface ItemSales {

		String getItemName();

		Long getQuantity();

		Long getRevenue();

	}

	/** Best sellers of paid orders in [from, to), by revenue. Grouped by name (the snapshot on the order). */
	@Query("""
			select i.itemName as itemName, sum(i.quantity) as quantity, sum(i.quantity * i.unitPrice) as revenue
			from OrderItem i join i.order o
			where o.status = com.cms.order.OrderStatus.PAID and o.createdAt >= :from and o.createdAt < :to
			group by i.itemName
			order by sum(i.quantity * i.unitPrice) desc, i.itemName
			""")
	List<ItemSales> findTopItems(@Param("from") Instant from, @Param("to") Instant to, Pageable limit);

}
