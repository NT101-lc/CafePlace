package com.cms.menu;

import java.util.Arrays;
import java.util.UUID;

import com.cms.common.error.AppException;
import com.cms.common.storage.ObjectStorage;
import com.cms.menu.dto.MenuItemResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Menu item images. The browser already shrinks photos (about 800px WebP) before uploading,
 * so 2 MB is a generous limit. The real file type is checked from its first bytes, not trusted
 * from the Content-Type header.
 */
@Service
public class MenuImageService {

	public static final int MAX_BYTES = 2 * 1024 * 1024;

	private enum ImageType {

		WEBP("image/webp", "webp"), JPEG("image/jpeg", "jpg"), PNG("image/png", "png");

		final String mimeType;

		final String extension;

		ImageType(String mimeType, String extension) {
			this.mimeType = mimeType;
			this.extension = extension;
		}

	}

	private final MenuItemService itemService;

	private final MenuItemRepository repository;

	private final ObjectStorage storage;

	public MenuImageService(MenuItemService itemService, MenuItemRepository repository, ObjectStorage storage) {
		this.itemService = itemService;
		this.repository = repository;
		this.storage = storage;
	}

	/** {@code data} may be longer than MAX_BYTES by one byte: that is how "too large" is detected. */
	@Transactional
	public MenuItemResponse upload(Long itemId, byte[] data) {
		if (data.length > MAX_BYTES) {
			throw new AppException(HttpStatus.PAYLOAD_TOO_LARGE, "IMAGE_TOO_LARGE", "Ảnh quá lớn (tối đa 2MB)");
		}
		ImageType type = detect(data);
		MenuItem item = itemService.find(itemId);

		// A new random name on every upload: browsers can cache images forever.
		String key = "menu/" + item.getShopId() + "/" + UUID.randomUUID() + "." + type.extension;
		storage.put(key, data, type.mimeType);
		String oldKey = item.getImageKey();
		item.setImageKey(key);
		repository.saveAndFlush(item);
		storage.deleteQuietly(oldKey);
		return itemService.toResponse(item);
	}

	@Transactional
	public MenuItemResponse remove(Long itemId) {
		MenuItem item = itemService.find(itemId);
		String oldKey = item.getImageKey();
		item.setImageKey(null);
		repository.saveAndFlush(item);
		storage.deleteQuietly(oldKey);
		return itemService.toResponse(item);
	}

	private static ImageType detect(byte[] data) {
		if (startsWith(data, 0, 0xFF, 0xD8, 0xFF)) {
			return ImageType.JPEG;
		}
		if (startsWith(data, 0, 0x89, 'P', 'N', 'G')) {
			return ImageType.PNG;
		}
		if (startsWith(data, 0, 'R', 'I', 'F', 'F') && startsWith(data, 8, 'W', 'E', 'B', 'P')) {
			return ImageType.WEBP;
		}
		throw new AppException(HttpStatus.BAD_REQUEST, "INVALID_IMAGE", "Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP");
	}

	private static boolean startsWith(byte[] data, int offset, int... expected) {
		if (data.length < offset + expected.length) {
			return false;
		}
		return Arrays.equals(Arrays.copyOfRange(data, offset, offset + expected.length),
				toBytes(expected));
	}

	private static byte[] toBytes(int[] values) {
		byte[] bytes = new byte[values.length];
		for (int i = 0; i < values.length; i++) {
			bytes[i] = (byte) values[i];
		}
		return bytes;
	}

}
