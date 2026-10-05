package com.cms.menu.dto;

import com.cms.menu.MenuCategory;

public record MenuCategoryResponse(Long id, String name, int sortOrder) {

	public static MenuCategoryResponse from(MenuCategory category) {
		return new MenuCategoryResponse(category.getId(), category.getName(), category.getSortOrder());
	}

}
