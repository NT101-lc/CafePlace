package com.cms.common.storage;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * {@code app.storage.*}: connection to the S3-compatible object storage (RustFS).
 *
 * @param endpoint  e.g. {@code http://localhost:9100} (dev) or {@code http://rustfs:9000} (Docker network)
 * @param region    any value works for RustFS; required by the S3 client
 * @param accessKey RustFS access key (env {@code S3_ACCESS_KEY})
 * @param secretKey RustFS secret key (env {@code S3_SECRET_KEY})
 * @param bucket    bucket for all uploaded files; created on startup if missing
 */
@ConfigurationProperties("app.storage")
public record StorageProperties(String endpoint, String region, String accessKey, String secretKey, String bucket) {
}
