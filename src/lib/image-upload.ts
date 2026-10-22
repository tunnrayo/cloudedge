/** Checks an uploaded image (type, size and real file signature) and returns its bytes, or an error message. */
export async function readImageUpload(file: FormDataEntryValue | null): Promise<{ none: true } | { error: string } | { bytes: Buffer; type: string; name: string }> {
  if (!file || typeof file !== "object" || !("size" in file) || file.size === 0) return { none: true };
  const allowed = ["image/png", "image/jpeg", "image/webp"];
  if (!allowed.includes(file.type)) return { error: "Image must be PNG, JPEG or WebP." };
  if (file.size > 2 * 1024 * 1024) return { error: "Image must be 2 MB or smaller." };
  const bytes = Buffer.from(await file.arrayBuffer());
  const sig = bytes.subarray(0, 12).toString("hex");
  const looksRight = sig.startsWith("89504e47") || sig.startsWith("ffd8ff") || (sig.startsWith("52494646") && bytes.subarray(8, 12).toString() === "WEBP");
  if (!looksRight) return { error: "The file does not look like a valid image." };
  return { bytes, type: file.type, name: String(file.name ?? "").slice(0, 200) };
}
