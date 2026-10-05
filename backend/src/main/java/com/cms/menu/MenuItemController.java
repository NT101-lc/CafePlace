package com.cms.menu;

import java.io.IOException;
import java.util.List;

import com.cms.menu.dto.AvailabilityRequest;
import com.cms.menu.dto.MenuItemRequest;
import com.cms.menu.dto.MenuItemResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Menu of the current shop. Everyone in the shop can read it and mark items sold out;
 * only the owner can add, edit or delete items.
 */
@RestController
@RequestMapping("/api/menu-items")
public class MenuItemController {

	private final MenuItemService service;

	private final MenuImageService imageService;

	public MenuItemController(MenuItemService service, MenuImageService imageService) {
		this.service = service;
		this.imageService = imageService;
	}

	@GetMapping
	public List<MenuItemResponse> list() {
		return service.list();
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	@PreAuthorize("hasRole('OWNER')")
	public MenuItemResponse create(@Valid @RequestBody MenuItemRequest request) {
		return service.create(request);
	}

	@PutMapping("/{id}")
	@PreAuthorize("hasRole('OWNER')")
	public MenuItemResponse update(@PathVariable Long id, @Valid @RequestBody MenuItemRequest request) {
		return service.update(id, request);
	}

	/** Quick "sold out" toggle used during service, allowed for staff too. */
	@PatchMapping("/{id}/availability")
	public MenuItemResponse setAvailability(@PathVariable Long id, @Valid @RequestBody AvailabilityRequest request) {
		return service.setAvailable(id, request.available());
	}

	@DeleteMapping("/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	@PreAuthorize("hasRole('OWNER')")
	public void delete(@PathVariable Long id) {
		service.delete(id);
	}

	/** Body is the raw image file (Content-Type image/webp, image/jpeg or image/png), max 2 MB. */
	@PutMapping("/{id}/image")
	@PreAuthorize("hasRole('OWNER')")
	public MenuItemResponse uploadImage(@PathVariable Long id, HttpServletRequest request) throws IOException {
		// Read at most one byte more than allowed, so a huge upload is never fully loaded into memory.
		byte[] data = request.getInputStream().readNBytes(MenuImageService.MAX_BYTES + 1);
		return imageService.upload(id, data);
	}

	@DeleteMapping("/{id}/image")
	@PreAuthorize("hasRole('OWNER')")
	public MenuItemResponse removeImage(@PathVariable Long id) {
		return imageService.remove(id);
	}

}
