import crypto from "crypto";

const ALGO = "aes-256-cbc";
const SECRET = Buffer.from(process.env.ENCRYPTION_SECRET!, "hex");

export function encrypt(text: string) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGO, SECRET, iv);

  const encrypted = Buffer.concat([
    cipher.update(text),
    cipher.final(),
  ]);

  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

export function decrypt(data: string) {
  const [ivHex, encryptedHex] = data.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const encryptedText = Buffer.from(encryptedHex, "hex");

  const decipher = crypto.createDecipheriv(ALGO, SECRET, iv);

  return Buffer.concat([
    decipher.update(encryptedText),
    decipher.final(),
  ]).toString();
}