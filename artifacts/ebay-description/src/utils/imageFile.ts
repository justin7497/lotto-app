const IMAGE_EXT = /\.(webp|jpe?g|png|gif|bmp|avif|heic|heif|svg)$/i;

export const IMAGE_ACCEPT =
  "image/*,image/webp,.webp,.jpg,.jpeg,.png,.gif,.bmp,.avif";

export function isImageFile(file: File): boolean {
  const type = file.type.toLowerCase();
  if (type.startsWith("image/")) return true;
  if (type === "application/octet-stream" && IMAGE_EXT.test(file.name)) return true;
  return IMAGE_EXT.test(file.name);
}

export function imageFormatLabel(file: File): string {
  const ext = file.name.split(".").pop()?.toUpperCase();
  if (ext) return ext;
  if (file.type.includes("webp")) return "WEBP";
  return file.type.replace("image/", "").toUpperCase() || "IMAGE";
}
