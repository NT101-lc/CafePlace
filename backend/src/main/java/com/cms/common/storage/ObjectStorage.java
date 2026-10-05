package com.cms.common.storage;

import java.net.URI;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.ResponseBytes;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.NoSuchBucketException;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.S3Exception;

/**
 * Stores files in RustFS (S3 API). Keys are plain strings like {@code menu/12/<uuid>.webp}.
 * The bucket is private: files are served to browsers through {@link MediaController}.
 */
@Service
public class ObjectStorage {

	private static final Logger log = LoggerFactory.getLogger(ObjectStorage.class);

	/** File content plus its MIME type. */
	public record StoredObject(byte[] data, String contentType) {
	}

	private final S3Client s3;

	private final String bucket;

	public ObjectStorage(StorageProperties props) {
		this.bucket = props.bucket();
		this.s3 = S3Client.builder()
			.endpointOverride(URI.create(props.endpoint()))
			.region(Region.of(props.region()))
			.credentialsProvider(
					StaticCredentialsProvider.create(AwsBasicCredentials.create(props.accessKey(), props.secretKey())))
			// RustFS is addressed as http://host:port/bucket/key, not http://bucket.host/key.
			.forcePathStyle(true)
			.httpClient(UrlConnectionHttpClient.create())
			.build();
	}

	/** Creates the bucket on first start so a fresh RustFS needs no manual setup. */
	@EventListener(ApplicationReadyEvent.class)
	public void ensureBucket() {
		try {
			s3.headBucket(b -> b.bucket(bucket));
		}
		catch (S3Exception ex) {
			// HEAD responses have no body, so "no such bucket" may arrive as a plain 404.
			if (!(ex instanceof NoSuchBucketException) && ex.statusCode() != 404) {
				throw ex;
			}
			s3.createBucket(b -> b.bucket(bucket));
			log.info("Created storage bucket '{}'", bucket);
		}
	}

	public void put(String key, byte[] data, String contentType) {
		s3.putObject(b -> b.bucket(bucket).key(key).contentType(contentType), RequestBody.fromBytes(data));
	}

	public Optional<StoredObject> get(String key) {
		try {
			ResponseBytes<GetObjectResponse> bytes = s3.getObjectAsBytes(b -> b.bucket(bucket).key(key));
			return Optional.of(new StoredObject(bytes.asByteArray(), bytes.response().contentType()));
		}
		catch (NoSuchKeyException | NoSuchBucketException ex) {
			return Optional.empty();
		}
		catch (S3Exception ex) {
			if (ex.statusCode() == 404) {
				return Optional.empty();
			}
			throw ex;
		}
	}

	/** Best effort: a leftover file is harmless, so failures are only logged. */
	public void deleteQuietly(String key) {
		if (key == null) {
			return;
		}
		try {
			s3.deleteObject(b -> b.bucket(bucket).key(key));
		}
		catch (RuntimeException ex) {
			log.warn("Could not delete object {}: {}", key, ex.getMessage());
		}
	}

}
