package com.cms.dashboard;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import com.cms.order.Order;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

/** Read-only revenue queries for the dashboard. */
interface DashboardRepository extends Repository<Order, Long> {

	/** Paid revenue of one day (Vietnam time). */
	interface DailySales {

		LocalDate getDay();

		long getRevenue();

		long getOrderCount();

	}

	/**
	 * Revenue of paid orders per Vietnam-time day in [from, to). Only days with sales are returned.
	 *
	 * <p>Native SQL because JPQL cannot group by "day in Vietnam time". Native queries are NOT
	 * filtered by Hibernate, so the caller must pass {@code TenantContext.currentShopId()}.
	 * Grouping per day in the database keeps the result small (at most ~730 rows for two years)
	 * no matter how many orders the shop has.
	 */
	@Query(nativeQuery = true, value = """
			select cast(o.created_at at time zone 'Asia/Ho_Chi_Minh' as date) as day,
			       cast(sum(o.total_amount) as bigint) as revenue,
			       count(*) as orderCount
			from orders o
			where o.shop_id = :shopId and o.status = 'PAID' and o.created_at >= :from and o.created_at < :to
			group by 1
			order by 1
			""")
	List<DailySales> findDailySales(@Param("shopId") long shopId, @Param("from") Instant from, @Param("to") Instant to);

	/** Totals since the shop started (JPQL, so filtered by shop automatically). */
	interface AllTimeSales {

		Long getRevenue();

		long getOrderCount();

		Instant getFirstOrderAt();

	}

	@Query("""
			select sum(o.totalAmount) as revenue, count(o) as orderCount, min(o.createdAt) as firstOrderAt
			from Order o
			where o.status = com.cms.order.OrderStatus.PAID
			""")
	AllTimeSales findAllTimeSales();

}
