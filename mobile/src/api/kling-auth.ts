/**
 * Generates a JWT token for Kling AI API authentication
 * @param accessKey - Your Kling AI Access Key
 * @param secretKey - Your Kling AI Secret Key
 * @returns JWT token string
 */
export async function generateKlingJWT(accessKey: string, secretKey: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  // JWT Header
  const header = {
    alg: "HS256",
    typ: "JWT",
  };

  // JWT Payload
  const payload = {
    iss: accessKey,           // Issuer: Your Access Key
    exp: now + 1800,          // Expires in 30 minutes
    nbf: now - 5,             // Not before: 5 seconds ago (buffer for time sync)
  };

  // Base64URL encode header and payload
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));

  // Create signature using HMAC-SHA256
  const dataToSign = `${encodedHeader}.${encodedPayload}`;
  const signature = await hmacSha256(dataToSign, secretKey);
  const encodedSignature = base64UrlEncode(signature);

  // Combine all parts
  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

/**
 * Pure JavaScript HMAC-SHA256 implementation for React Native
 * Based on the standard HMAC algorithm
 */
async function hmacSha256(message: string, secret: string): Promise<string> {
  // Convert strings to UTF-8 byte arrays
  const msgBytes = stringToBytes(message);
  const keyBytes = stringToBytes(secret);

  // HMAC-SHA256 implementation
  const blockSize = 64; // SHA-256 block size in bytes

  // If key is longer than block size, hash it
  let key = keyBytes;
  if (key.length > blockSize) {
    key = await sha256Bytes(key);
  }

  // If key is shorter than block size, pad it with zeros
  if (key.length < blockSize) {
    const paddedKey = new Uint8Array(blockSize);
    paddedKey.set(key);
    key = paddedKey;
  }

  // Create inner and outer padded keys
  const ipad = new Uint8Array(blockSize);
  const opad = new Uint8Array(blockSize);

  for (let i = 0; i < blockSize; i++) {
    ipad[i] = key[i] ^ 0x36;
    opad[i] = key[i] ^ 0x5c;
  }

  // Compute hash(opad || hash(ipad || message))
  const innerData = new Uint8Array(ipad.length + msgBytes.length);
  innerData.set(ipad);
  innerData.set(msgBytes, ipad.length);
  const innerHash = await sha256Bytes(innerData);

  const outerData = new Uint8Array(opad.length + innerHash.length);
  outerData.set(opad);
  outerData.set(innerHash, opad.length);
  const hmac = await sha256Bytes(outerData);

  // Convert to base64
  return bytesToBase64(hmac);
}

/**
 * SHA-256 hash function using expo-crypto
 */
async function sha256Bytes(data: Uint8Array): Promise<Uint8Array> {
  const Crypto = await import("expo-crypto");

  // Use digest() for binary data (not digestStringAsync which is for strings)
  // Create a new Uint8Array with standard ArrayBuffer to satisfy TypeScript
  const standardArray = new Uint8Array(data);
  const hashBuffer = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, standardArray);

  // Convert ArrayBuffer to Uint8Array
  return new Uint8Array(hashBuffer);
}

/**
 * Convert string to UTF-8 byte array
 */
function stringToBytes(str: string): Uint8Array {
  const utf8 = unescape(encodeURIComponent(str));
  const bytes = new Uint8Array(utf8.length);
  for (let i = 0; i < utf8.length; i++) {
    bytes[i] = utf8.charCodeAt(i);
  }
  return bytes;
}

/**
 * Convert byte array to base64
 */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert base64 to byte array
 */
function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Base64URL encoding (RFC 4648)
 * Converts string to base64url format (URL-safe base64)
 */
function base64UrlEncode(str: string): string {
  // For objects that are already base64
  if (typeof str !== "string") {
    str = String(str);
  }

  // If it's a base64 string, convert it
  if (str.length > 0 && !str.includes("{")) {
    return str
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }

  // Otherwise encode the JSON string first
  const base64 = btoa(unescape(encodeURIComponent(str)));

  // Make it URL-safe
  return base64
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
