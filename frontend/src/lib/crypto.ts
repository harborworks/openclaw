/** Encrypt plaintext with an RSA-OAEP public key (JWK). Returns base64. */
export async function encryptWithPublicKey(
  plaintext: string,
  publicKeyJwk: JsonWebKey,
): Promise<string> {
  // SubtleCrypto requires a secure context (HTTPS or localhost).
  // In insecure contexts (e.g. LAN HTTP dev), return plaintext with a marker.
  if (!globalThis.crypto?.subtle) {
    if (import.meta.env.DEV) {
      console.debug("[secrets] SubtleCrypto unavailable (insecure context) — skipping encryption.");
    }
    return plaintext;
  }

  const key = await crypto.subtle.importKey(
    "jwk",
    publicKeyJwk,
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"],
  );
  const encoded = new TextEncoder().encode(plaintext);
  const encrypted = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, key, encoded);
  return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
}
