package com.cms.menu;

import java.text.Collator;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import com.cms.common.error.AppException;
import com.cms.common.storage.ObjectStorage;
import com.cms.menu.dto.MenuItemRequest;
import com.cms.menu.dto.MenuItemResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Menu management. All repository calls are already limited to the current shop. */
@Service
public class MenuItemService {

	private final MenuItemRepository repository;

	private final MenuCategoryService categoryService;

	private final ObjectStorage storage;

	public MenuItemService(MenuItemRepository repository, MenuCategoryService categoryService,
			ObjectStorage storage) {
		this.repository = repository;
		this.categoryService = categoryService;
		this.storage = storage;
	}

	/** Ordered by the owner's category order (items without category last), then by name. */
	@Transactional(readOnly = true)
	public List<MenuItemResponse> list() {
		Map<Long, MenuCategory> categories = categoryService.findAllById();
		Collator vietnamese = Collator.getInstance(Locale.forLanguageTag("vi"));
		Comparator<MenuItem> byCategory = Comparator.comparingInt(
				item -> item.getCategory() == null ? Integer.MAX_VALUE
						: categories.get(item.getCategory().getId()).getSortOrder());
		return repository.findAll()
			.stream()
			.sorted(byCategory.thenComparing(MenuItem::getName, vietnamese))
			.map(item -> MenuItemResponse.from(item,
					item.getCategory() == null ? null : categories.get(item.getCategory().getId())))
			.toList();
	}

	@Transactional
	public MenuItemResponse create(MenuItemRequest request) {
		MenuItem item = new MenuItem(request.name().trim(), categoryService.findOrCreate(request.category()),
				request.price());
		item.setAvailable(request.available() == null || request.available());
		// saveAndFlush so the response carries the timestamps set on insert.
		return toResponse(repository.saveAndFlush(item));
	}

	@Transactional
	public MenuItemResponse update(Long id, MenuItemRequest request) {
		MenuItem item = find(id);
		MenuCategory oldCategory = item.getCategory();
		item.setName(request.name().trim());
		item.setCategory(categoryService.findOrCreate(request.category()));
		item.setPrice(request.price());
		if (request.available() != null) {
			item.setAvailable(request.available());
		}
		repository.saveAndFlush(item);
		if (oldCategory != item.getCategory()) {
			categoryService.deleteIfUnused(oldCategory);
		}
		return toResponse(item);
	}

	@Transactional
	public MenuItemResponse setAvailable(Long id, boolean available) {
		MenuItem item = find(id);
		item.setAvailable(available);
		return toResponse(repository.saveAndFlush(item));
	}

	/** Old orders keep the item's name and price (snapshot), so deleting is safe. */
	@Transactional
	public void delete(Long id) {
		MenuItem item = find(id);
		repository.delete(item);
		repository.flush();
		categoryService.deleteIfUnused(item.getCategory());
		storage.deleteQuietly(item.getImageKey());
	}

	MenuItem find(Long id) {
		// An item of another shop is simply not found: the tenant filter hides it.
		return repository.findById(id).orElseThrow(() -> AppException.notFound("Không tìm thấy món"));
	}

	MenuItemResponse toResponse(MenuItem item) {
		return MenuItemResponse.from(item, item.getCategory());
	}

}
