import bcrypt from "bcrypt";

/**
 * Password hashing and verification using bcrypt.
 * Cost factor 12 as specified in Section 6.1 / 10.1.
 *
 * @see PayCore_Build_Prompt.md Section 6.1, 10.1
 */

const BCRYPT_COST_FACTOR = 12;

/**
 * Hash a plaintext password with bcrypt (cost >= 12).
 * Never log the raw password — only the hash is stored.
 */
export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, BCRYPT_COST_FACTOR);
}

/**
 * Verify a plaintext password against a bcrypt hash.
 * Returns true if they match.
 */
export async function verifyPassword(
  plaintext: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}
