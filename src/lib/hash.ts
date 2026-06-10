/**
 * SHA-256 hex digest. Used to store opaque secrets (e.g. refresh tokens) hashed
 * at rest so a database leak doesn't hand out usable credentials — the lookup
 * hashes the presented value and compares digests.
 */
export function sha256Hex(value: string): string {
  return new Bun.CryptoHasher("sha256").update(value).digest("hex");
}

/**
 * Cryptographically random opaque token, base64url-encoded (43 chars at the
 * default 32 bytes). 256 bits of entropy make collisions on a unique column
 * practically impossible — no embedded claims, nothing to forge offline.
 */
export function randomToken(bytes = 32): string {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(bytes))).toString(
    "base64url",
  );
}
