import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY;
  if (envKey) {
    if (envKey.length === 64) {
      return Buffer.from(envKey, "hex");
    }
    return crypto.createHash("sha256").update(envKey).digest();
  }
  // Fallback for development if not provided
  return crypto.createHash("sha256").update("paycore-default-encryption-key-v1").digest();
}

/**
 * Encrypt sensitive plaintext string using AES-256-GCM.
 * Output format: iv_hex:authTag_hex:ciphertext_hex
 */
export function encryptField(plainText: string | null | undefined): string | null {
  if (!plainText) return null;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  
  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypt AES-256-GCM ciphertext.
 */
export function decryptField(cipherText: string | null | undefined): string | null {
  if (!cipherText) return null;
  try {
    const parts = cipherText.split(":");
    if (parts.length !== 3) return cipherText; // Return as-is if unencrypted legacy

    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    // If decryption fails, avoid crashing
    return null;
  }
}

/**
 * Mask sensitive numbers for UI display (e.g. Bank Account or PAN)
 */
export function maskSensitive(value: string | null | undefined, visibleTrailingChars = 4): string {
  if (!value) return "—";
  if (value.length <= visibleTrailingChars) return value;
  const maskedLength = value.length - visibleTrailingChars;
  return "•".repeat(Math.min(maskedLength, 8)) + value.slice(-visibleTrailingChars);
}
