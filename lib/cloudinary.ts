const VIDEO_UPLOAD_MARKER = "/video/upload/";

// Every exercise clip in the dataset is a square 180x180 (1:1) file. The
// transformation must never crop it: `c_limit` only downsizes (never upscales,
// never crops) and keeps the original aspect ratio.
export const EXERCISE_MEDIA_ASPECT_RATIO = 1;
const VIDEO_TRANSFORMATION = "f_auto,q_auto,c_limit,w_720,h_720";
// Older builds forced a 16:9 `c_fill` crop that cut the figure. Strip it if a
// stored URL still carries it so the media is served uncropped.
const LEGACY_TRANSFORMATION_PATTERN = /(?:f_auto,q_auto,)?c_fill,w_960,h_540\//;

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

  const cleanUrl = url.replace(LEGACY_TRANSFORMATION_PATTERN, "");

  if (cleanUrl.includes(`${VIDEO_UPLOAD_MARKER}${VIDEO_TRANSFORMATION}/`)) {
    return cleanUrl;
  }

  return cleanUrl.replace(
    VIDEO_UPLOAD_MARKER,
    `${VIDEO_UPLOAD_MARKER}${VIDEO_TRANSFORMATION}/`,
  );
}
