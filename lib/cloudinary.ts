const VIDEO_UPLOAD_MARKER = "/video/upload/";
// 16:9, recorte centrado (c_fill) para que todos los videos de ejercicios
// midan lo mismo en la app, sin importar la proporcion con la que se subieron.
const VIDEO_TRANSFORMATION = "c_fill,w_960,h_540";

function isCloudinaryVideoUrl(parsed: URL): boolean {
  return (
    parsed.hostname.includes("res.cloudinary.com") &&
    parsed.pathname.includes(VIDEO_UPLOAD_MARKER)
  );
}

export function normalizeVideoUrl(url?: string | null): string {
  if (!url) {
    return url ?? "";
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }

  if (!isCloudinaryVideoUrl(parsed)) {
    return url;
  }

  if (parsed.pathname.includes(`${VIDEO_UPLOAD_MARKER}${VIDEO_TRANSFORMATION}/`)) {
    return url;
  }

  return url.replace(
    VIDEO_UPLOAD_MARKER,
    `${VIDEO_UPLOAD_MARKER}${VIDEO_TRANSFORMATION}/`,
  );
}
