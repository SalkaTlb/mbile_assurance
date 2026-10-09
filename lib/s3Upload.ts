/**
 * s3Upload.ts
 *
 * Secure production S3 upload via Odoo Pre-Signed URLs.
 *
 * Flow:
 *   1. Mobile calls Odoo  → POST /api/s3_upload_url
 *   2. Odoo (server-side) → generates boto3 pre-signed PUT URL (AWS keys never leave server)
 *   3. Mobile does        → PUT <presigned_url>  (direct to S3, no auth headers needed)
 *
 * No AWS credentials in the mobile app. No external crypto library needed.
 */

import { getS3UploadUrl } from "@/lib/api";

// ─── Public types ─────────────────────────────────────────────────────────────

export interface S3UploadResult {
  success: boolean;
  /** Full HTTPS URL of the stored document on S3 */
  url?: string;
  /** S3 object key (path inside the bucket) */
  key?: string;
  error?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build the S3 folder category from a document category string.
 * "attestation" → "attestations" | "sinistre" → "sinistres"
 */
export function buildS3Category(
  category: "attestation" | "sinistre",
): "attestations" | "sinistres" {
  return category === "attestation" ? "attestations" : "sinistres";
}

// ─── Main upload function ─────────────────────────────────────────────────────

/**
 * Upload a PDF to AWS S3 via a server-generated pre-signed URL.
 *
 * @param base64Data  Base64-encoded PDF (from expo-file-system readAsStringAsync)
 * @param filename    Filename only — e.g. "Attestation_POL_001.pdf"
 * @param category    Document category: "attestation" | "sinistre"
 */
export async function uploadToS3(
  base64Data: string,
  filename: string,
  category: "attestation" | "sinistre",
): Promise<S3UploadResult> {
  try {
    // Step 1 — Get a pre-signed PUT URL from the Odoo server
    const s3Category = buildS3Category(category);
    const urlResponse = await getS3UploadUrl(
      filename,
      s3Category,
      "application/pdf",
    );

    if (!urlResponse.success || !urlResponse.upload_url) {
      const errMsg =
        urlResponse.msg || "Impossible d'obtenir l'URL d'upload S3.";
      console.warn("[S3] Pre-signed URL error:", errMsg);
      return { success: false, error: errMsg };
    }

    const { upload_url, public_url, s3_key } = urlResponse;

    // Step 2 — Decode base64 → binary Uint8Array
    const binaryStr = atob(base64Data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    // Step 3 — PUT directly to S3 using the pre-signed URL
    //           No Authorization header needed — the signature is in the URL itself
    const response = await fetch(upload_url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/pdf",
      },
      body: bytes.buffer as ArrayBuffer,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[S3] Upload PUT failed:", response.status, errText);
      return {
        success: false,
        error: `S3 PUT ${response.status}: ${errText.slice(0, 200)}`,
      };
    }

    console.log("[S3] ✅ Upload réussi →", public_url);
    return {
      success: true,
      url: public_url,
      key: s3_key,
    };
  } catch (err: any) {
    console.error("[S3] Exception:", err);
    return {
      success: false,
      error: err?.message ?? "Erreur inconnue lors de l'upload S3",
    };
  }
}
