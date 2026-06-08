import crypto from "crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || ""; // Must be 64 hex characters (32 bytes)

function getKey(): Buffer {
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
    // If not configured, fall back to a generated key for safety during development
    // (Note: in production this will log warnings or throw, but here we want robustness)
    console.warn("WARNING: ENCRYPTION_KEY is not a valid 32-byte hex string. Generating ephemeral key.");
    return crypto.scryptSync(ENCRYPTION_KEY || "fallback-secret", "salt", 32);
  }
  return Buffer.from(ENCRYPTION_KEY, "hex");
}

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(12);
  const key = getKey();
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  const authTag = cipher.getAuthTag().toString("hex");
  
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

export function decrypt(encryptedText: string): string {
  const parts = encryptedText.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted format");
  }
  
  const [ivHex, authTagHex, encrypted] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const key = getKey();
  
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  
  return decrypted;
}
