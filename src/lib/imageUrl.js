// Every photo uploaded to the `product-images` bucket also gets a small copy
// (640px wide, ~60 KB) saved next to it as `<name>.thumb.jpg`. Cards and
// category tiles use the small copy; product pages use the full photo.
const BUCKET_PATH = '/storage/v1/object/public/product-images/';

export const THUMB_WIDTH = 640;

export function thumbPath(path) {
  return path.replace(/\.[^./]+$/, '') + '.thumb.jpg';
}

export function thumbUrl(url) {
  if (!url || !url.includes(BUCKET_PATH) || url.includes('.thumb.')) return url;
  return thumbPath(url);
}

// onError handler: if the small copy is missing (e.g. an image added before
// thumbnails existed), fall back to the full photo, then to the placeholder.
export function imageFallback(fullUrl, placeholder) {
  return (e) => {
    const img = e.currentTarget;
    if (fullUrl && img.src !== fullUrl) { img.src = fullUrl; return; }
    img.onerror = null;
    img.src = placeholder;
  };
}
