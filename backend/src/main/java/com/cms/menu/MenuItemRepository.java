package com.cms.menu;

import org.springframework.data.jpa.repository.JpaRepository;

/** Every query here is automatically limited to the current shop. */
public interface MenuItemRepository extends JpaRepository<MenuItem, Long> {

}
