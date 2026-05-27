/**
 * KUDOS · Provider · Cloudflare R2 upload via AWS SigV4 (no SDK · pure fetch).
 *
 *   PUT https://<account_id>.r2.cloudflarestorage.com/<bucket>/<key>
 *
 * Public read served from `R2_PUBLIC_BASE` (configure CDN/custom domain to
 * point at the bucket origin).
 *
 * Uploads small files (≤ ~5MB capsules + thumbs) · single PUT, no multipart.
 */
import * as fs from "node:fs";
import * as crypto from "node:crypto";
import { env } from "../env";
import { http, withRetry } from "../retry";
import type { StorageUploadInput, StorageUploadOutput } from "../types";

export async function callR2Upload(input: StorageUploadInput): Promise<StorageUploadOutput> {
  const t0 = Date.now();
  const e  = env();

  const body = await fs.promises.readFile(input.local_path);
  const host = `${e.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const url  = `https://${host}/${e.R2_BUCKET}/${encodeKey(input.key)}`;

  const signed = sigV4PutHeaders({
    method:       "PUT",
    host,
    path:         `/${e.R2_BUCKET}/${encodeKey(input.key)}`,
    body,
    contentType:  input.content_type,
    accessKey:    e.R2_ACCESS_KEY_ID,
    secretKey:    e.R2_SECRET_ACCESS_KEY,
    region:       "auto",
  });

  await withRetry(() =>
    http(url, {
      method:  "PUT",
      headers: signed,
      body,
      timeoutMs: 60_000,
    })
  );

  const publicUrl = `${e.R2_PUBLIC_BASE.replace(/\/$/, "")}/${input.key}`;
  return {
    url:        publicUrl,
    bytes:      body.length,
    ms:         Date.now() - t0,
    cost_cents: Math.ceil((body.length / 1_000_000_000) * 1.5),  // $0.015/GB-month · prorated trivially
  };
}

// ─── Minimal AWS SigV4 implementation for single-shot PUT ────────────────

function encodeKey(key: string): string {
  return key.split("/").map(encodeURIComponent).join("/");
}

interface SigV4Input {
  method:       string;
  host:         string;
  path:         string;
  body:         Buffer;
  contentType:  string;
  accessKey:    string;
  secretKey:    string;
  region:       string;     // R2 uses "auto"
}

function sigV4PutHeaders(i: SigV4Input): Record<string, string> {
  const now = new Date();
  const amzDate    = isoBasic(now);                      // 20250526T103000Z
  const dateStamp  = amzDate.slice(0, 8);                // 20250526
  const service    = "s3";
  const algorithm  = "AWS4-HMAC-SHA256";

  const payloadHash = sha256Hex(i.body);

  const canonHeaders =
    `content-type:${i.contentType}\n` +
    `host:${i.host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;
  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";

  const canonRequest =
    `${i.method}\n${i.path}\n\n${canonHeaders}\n${signedHeaders}\n${payloadHash}`;

  const credScope = `${dateStamp}/${i.region}/${service}/aws4_request`;
  const stringToSign =
    `${algorithm}\n${amzDate}\n${credScope}\n${sha256Hex(Buffer.from(canonRequest))}`;

  const kDate    = hmac(`AWS4${i.secretKey}`, dateStamp);
  const kRegion  = hmac(kDate,    i.region);
  const kService = hmac(kRegion,  service);
  const kSigning = hmac(kService, "aws4_request");
  const signature = hmacHex(kSigning, stringToSign);

  const authorization =
    `${algorithm} Credential=${i.accessKey}/${credScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    "Content-Type":          i.contentType,
    "Host":                  i.host,
    "X-Amz-Content-Sha256":  payloadHash,
    "X-Amz-Date":            amzDate,
    "Authorization":         authorization,
  };
}

function isoBasic(d: Date): string {
  const s = d.toISOString();
  return s.replace(/[:\-]|\.\d{3}/g, "");
}
function sha256Hex(b: Buffer): string {
  return crypto.createHash("sha256").update(b).digest("hex");
}
function hmac(key: crypto.BinaryLike | crypto.KeyObject, data: string): Buffer {
  return crypto.createHmac("sha256", key).update(data, "utf8").digest();
}
function hmacHex(key: crypto.BinaryLike | crypto.KeyObject, data: string): string {
  return crypto.createHmac("sha256", key).update(data, "utf8").digest("hex");
}
