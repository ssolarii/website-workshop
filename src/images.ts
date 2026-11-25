export async function compress(file: File) {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
    throw Error("Choose a JPEG, PNG, or WebP image.");
  const image = await createImageBitmap(file),
    scale = Math.min(1, 1600 / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  let blob: Blob | null = null;
  try {
    for (const factor of [1, 0.75, 0.5, 0.25]) {
      canvas.width = Math.max(1, Math.round(image.width * scale * factor));
      canvas.height = Math.max(1, Math.round(image.height * scale * factor));
      canvas
        .getContext("2d")!
        .drawImage(image, 0, 0, canvas.width, canvas.height);
      blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/webp", 0.8),
      );
      if (blob?.type === "image/webp" && blob.size <= 600000) break;
    }
  } finally {
    image.close();
  }
  if (blob?.type !== "image/webp" || blob.size > 600000)
    throw Error("Please choose a smaller image.");
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob!);
  });
}
export const gallery = [
  { name: "Lakeside", path: "profile.webp" },
  { name: "Architecture", path: "architecture.webp" },
  { name: "Meeting", path: "event.webp" },
  { name: "Mountain lake", path: "lake.svg" },
  { name: "Garden leaves", path: "leaves.svg" },
  { name: "Blue shapes", path: "shapes.svg" },
];
export const galleryUrl = (path: string) =>
  new URL("gallery/" + path, location.href).href;

export function portableGalleryUrl(value: string) {
  if (typeof location === "undefined") return value;
  const path = gallery.find(
    ({ path }) =>
      value === galleryUrl(path) ||
      new RegExp(
        "^https?://(?:localhost|127\\.0\\.0\\.1)(?::\\d+)?/gallery/" +
          path.replace(".", "\\.") +
          "$",
      ).test(value),
  )?.path;
  return path ? "gallery:" + path : value;
}

export function resolveGalleryUrl(value: string) {
  const path = gallery.find(({ path }) => value === "gallery:" + path)?.path;
  if (!path) return undefined;
  return typeof location === "undefined"
    ? "./gallery/" + path
    : galleryUrl(path);
}
