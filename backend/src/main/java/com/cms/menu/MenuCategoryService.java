package com.cms.menu;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.cms.common.error.AppException;
import com.cms.menu.dto.MenuCategoryResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * Menu categories. Owners never create or delete them directly: typing a new category name on an
 * item creates it (at the end of the list), and a category disappears when its last item leaves.
 */
@Service
public class MenuCategoryService {

	private final MenuCategoryRepository categoryRepository;

	private final MenuItemRepository itemRepository;

	public MenuCategoryService(MenuCategoryRepository categoryRepository, MenuItemRepository itemRepository) {
		this.categoryRepository = categoryRepository;
		this.itemRepository = itemRepository;
	}

	@Transactional(readOnly = true)
	public List<MenuCategoryResponse> list() {
		return findAllOrdered().stream().map(MenuCategoryResponse::from).toList();
	}

	List<MenuCategory> findAllOrdered() {
		return categoryRepository.findAllByOrderBySortOrderAscNameAsc();
	}

	Map<Long, MenuCategory> findAllById() {
		return findAllOrdered().stream().collect(Collectors.toMap(MenuCategory::getId, Function.identity()));
	}

	/** Blank name → null (no category). Unknown name → new category placed last. */
	MenuCategory findOrCreate(String name) {
		if (!StringUtils.hasText(name)) {
			return null;
		}
		String trimmed = name.trim();
		return categoryRepository.findByName(trimmed)
			.orElseGet(() -> categoryRepository
				.save(new MenuCategory(trimmed, categoryRepository.findMaxSortOrder() + 1)));
	}

	/** Called after an item left {@code category}: drop the category if nothing uses it anymore. */
	void deleteIfUnused(MenuCategory category) {
		if (category != null && !itemRepository.existsByCategory(category)) {
			categoryRepository.delete(category);
		}
	}

	/** {@code ids} must contain every category of the shop exactly once, in the new order. */
	@Transactional
	public List<MenuCategoryResponse> reorder(List<Long> ids) {
		Map<Long, MenuCategory> categories = findAllById();
		if (ids.size() != categories.size() || !new HashSet<>(ids).equals(categories.keySet())) {
			throw new AppException(HttpStatus.BAD_REQUEST, "CATEGORY_LIST_MISMATCH",
					"Danh sách nhóm đã thay đổi, vui lòng tải lại trang rồi thử lại");
		}
		for (int i = 0; i < ids.size(); i++) {
			categories.get(ids.get(i)).setSortOrder(i);
		}
		categoryRepository.flush();
		return list();
	}

}
