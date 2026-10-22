// Encryption for hosts' tax numbers (DAC7). The key is the TAX_ID_KEY
// function secret (32 random bytes, base64), never stored in the database.
// From it, HKDF derives one key for AES-GCM and one for a keyed hash that
// spots the same number on two host accounts without decrypting anything.
// Losing TAX_ID_KEY makes the stored numbers unreadable (hosts would have to
// enter them again); changing it needs a re-encryption first.

const enc = new TextEncoder();
const dec = new TextDecoder();

const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const fromBase64 = (text: string) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

let keys: Promise<{ aes: CryptoKey; hmac: CryptoKey }> | null = null;

function taxKeys() {
  // A failed load (secret missing or wrong) is retried next time, not kept
  keys ??= (async () => {
    const secret = Deno.env.get("TAX_ID_KEY");
    if (!secret) throw new Error("TAX_ID_KEY is not set");
    const raw = fromBase64(secret);
    if (raw.length !== 32) throw new Error("TAX_ID_KEY must be 32 bytes, base64");
    const master = await crypto.subtle.importKey("raw", raw, "HKDF", false, ["deriveKey"]);
    const derive = (info: string, algorithm: AesKeyGenParams | HmacKeyGenParams, usages: KeyUsage[]) =>
      crypto.subtle.deriveKey({ name: "HKDF", hash: "SHA-256", salt: new Uint8Array(32), info: enc.encode(info) }, master, algorithm, false, usages);
    return {
      aes: await derive("nordic-getaways tax id aes-gcm v1", { name: "AES-GCM", length: 256 }, ["encrypt", "decrypt"]),
      hmac: await derive("nordic-getaways tax id hmac v1", { name: "HMAC", hash: "SHA-256", length: 256 }, ["sign"]),
    };
  })().catch((error) => {
    keys = null;
    throw error;
  });
  return keys;
}

/** "v1:<iv>:<ciphertext>", base64 */
export async function encryptTaxId(plain: string): Promise<string> {
  const { aes } = await taxKeys();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aes, enc.encode(plain)));
  return `v1:${toBase64(iv)}:${toBase64(cipher)}`;
}

export async function decryptTaxId(stored: string): Promise<string> {
  const [version, iv, cipher] = stored.split(":");
  if (version !== "v1" || !iv || !cipher) throw new Error("Unknown tax id format");
  const { aes } = await taxKeys();
  return dec.decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromBase64(iv) }, aes, fromBase64(cipher)));
}

/** Same country and number give the same hash (hex) */
export async function taxIdHash(country: string, number: string): Promise<string> {
  const { hmac } = await taxKeys();
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", hmac, enc.encode(`${country}:${number}`)));
  return Array.from(mac, (b) => b.toString(16).padStart(2, "0")).join("");
}
