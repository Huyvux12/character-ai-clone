import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "node:crypto";

function secret() {
  const value = process.env.API_KEY_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET;
  if (!value || value.length < 32) throw new Error("Set API_KEY_ENCRYPTION_KEY to at least 32 characters");
  return createHash("sha256").update(value).digest();
}

export function keyIdentity(apiKey) {
  return createHmac("sha256", secret()).update(apiKey).digest("hex").slice(0, 40);
}

export function encryptApiKey(apiKey) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", secret(), iv);
  const ciphertext = Buffer.concat([cipher.update(apiKey, "utf8"), cipher.final()]);
  return `enc:v1:${iv.toString("base64url")}:${cipher.getAuthTag().toString("base64url")}:${ciphertext.toString("base64url")}`;
}

export function decryptApiKey(stored) {
  if (!stored) return null;
  // Existing installations stored MuAPI keys as plaintext; callers migrate on sign-in/save.
  if (!stored.startsWith("enc:v1:")) return stored;
  const [, , iv, tag, ciphertext] = stored.split(":");
  const decipher = createDecipheriv("aes-256-gcm", secret(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8");
}
