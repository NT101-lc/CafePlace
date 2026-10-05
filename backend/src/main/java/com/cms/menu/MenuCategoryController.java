package com.cms.menu;

import java.util.List;

import com.cms.menu.dto.CategoryOrderRequest;
import com.cms.menu.dto.MenuCategoryResponse;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Menu categories in display order. They are created/removed through menu items (see MenuCategoryService). */
@RestController
@RequestMapping("/api/menu-categories")
public class MenuCategoryController {

	private final MenuCategoryService service;

	public MenuCategoryController(MenuCategoryService service) {
		this.service = service;
	}

	@GetMapping
	public List<MenuCategoryResponse> list() {
		return service.list();
	}

	@PutMapping("/order")
	@PreAuthorize("hasRole('OWNER')")
	public List<MenuCategoryResponse> reorder(@Valid @RequestBody CategoryOrderRequest request) {
		return service.reorder(request.ids());
	}

}
