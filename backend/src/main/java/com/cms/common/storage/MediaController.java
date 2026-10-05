package com.cms.common.storage;

import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;

import com.cms.common.error.AppException;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

/**
 * Serves uploaded images to browsers. Public (an {@code <img>} tag cannot send the JWT), so file names
 * are random UUIDs that cannot be guessed. A new upload always gets a new name, so responses can be
 * cached forever by the browser and the service worker.
 */
@RestController
public class MediaController {

	/** Only keys created by our own upload code: menu/{shopId}/{uuid}.{ext} */
	private static final Pattern FILE_NAME = Pattern.compile("[0-9a-f-]{36}\\.(webp|jpg|png)");

	private final ObjectStorage storage;

	public MediaController(ObjectStorage storage) {
		this.storage = storage;
	}

	@GetMapping("/api/media/menu/{shopId}/{fileName}")
	public ResponseEntity<byte[]> menuImage(@PathVariable long shopId, @PathVariable String fileName) {
		if (!FILE_NAME.matcher(fileName).matches()) {
			throw AppException.notFound("Không tìm thấy ảnh");
		}
		ObjectStorage.StoredObject file = storage.get("menu/" + shopId + "/" + fileName)
			.orElseThrow(() -> AppException.notFound("Không tìm thấy ảnh"));
		return ResponseEntity.ok()
			.contentType(MediaType.parseMediaType(file.contentType()))
			.cacheControl(CacheControl.maxAge(365, TimeUnit.DAYS).cachePublic().immutable())
			.body(file.data());
	}

}
