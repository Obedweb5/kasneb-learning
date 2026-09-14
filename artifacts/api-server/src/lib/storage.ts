import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be set to use file storage.`);
  }
  return value;
}

let cachedClient: S3Client | null = null;

/**
 * Works with any S3-compatible provider (AWS S3, Cloudflare R2,
 * Backblaze B2, DigitalOcean Spaces, MinIO, ...). Point S3_ENDPOINT
 * at the provider's endpoint; for AWS itself, leave S3_ENDPOINT unset
 * and the SDK will use the default AWS endpoint for S3_REGION.
 */
function getClient(): S3Client {
  if (cachedClient) return cachedClient;

  cachedClient = new S3Client({
    region: process.env["S3_REGION"] || "auto",
    endpoint: process.env["S3_ENDPOINT"] || undefined,
    forcePathStyle: Boolean(process.env["S3_ENDPOINT"]),
    credentials: {
      accessKeyId: requireEnv("S3_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("S3_SECRET_ACCESS_KEY"),
    },
  });
  return cachedClient;
}

function bucket(): string {
  return requireEnv("S3_BUCKET");
}

/**
 * Generates a short-lived URL the admin's browser can PUT the raw
 * file bytes to directly — the file never passes through our server,
 * which keeps large video uploads cheap and fast.
 */
export async function createUploadUrl(params: {
  contentType: string;
  folder: string;
}): Promise<{ uploadUrl: string; fileKey: string }> {
  const fileKey = `${params.folder}/${randomUUID()}`;
  const command = new PutObjectCommand({
    Bucket: bucket(),
    Key: fileKey,
    ContentType: params.contentType,
  });
  const uploadUrl = await getSignedUrl(getClient(), command, {
    expiresIn: 900, // 15 minutes
  });
  return { uploadUrl, fileKey };
}

/**
 * Generates a short-lived download URL. Callers must verify the
 * requesting student has actually purchased the resource before
 * calling this — the URL itself grants access to anyone holding it
 * for the next few minutes.
 */
export async function createDownloadUrl(fileKey: string): Promise<string> {
  const command = new GetObjectCommand({ Bucket: bucket(), Key: fileKey });
  return getSignedUrl(getClient(), command, { expiresIn: 300 }); // 5 minutes
}

export async function deleteFile(fileKey: string): Promise<void> {
  await getClient().send(
    new DeleteObjectCommand({ Bucket: bucket(), Key: fileKey }),
  );
}
