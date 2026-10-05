package com.cms.menu.dto;

import java.time.Instant;

import com.cms.menu.MenuCategory;
import com.cms.menu.MenuItem;

/**
 * @param category display name of the category, null = "Khác"
 * @param imageUrl relative URL of the image (e.g. {@code /api/media/menu/12/<uuid>.webp}), null = no image
 */
public record MenuItemResponse(Long id, String name, Long categoryId, String category, long price, boolean available,
		String imageUrl, Instant updatedAt) {

	public static MenuItemResponse from(MenuItem item, MenuCategory category) {
		return new MenuItemResponse(item.getId(), item.getName(), category == null ? null : category.getId(),
				category == null ? null : category.getName(), item.getPrice(), item.isAvailable(),
				item.getImageKey() == null ? null : "/api/media/" + item.getImageKey(), item.getUpdatedAt());
	}

}
