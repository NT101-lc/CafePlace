package com.cms.menu;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

/** Every query here is automatically limited to the current shop. */
public interface MenuCategoryRepository extends JpaRepository<MenuCategory, Long> {

	List<MenuCategory> findAllByOrderBySortOrderAscNameAsc();

	Optional<MenuCategory> findByName(String name);

	/** -1 when the shop has no category yet, so "max + 1" is 0 for the first one. */
	@Query("select coalesce(max(c.sortOrder), -1) from MenuCategory c")
	int findMaxSortOrder();

}
