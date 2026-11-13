// Removes photo metadata before upload: EXIF (which can hold the GPS location
// a phone photo was taken at, the camera and the date), XMP, IPTC, comments,
// and the extra images some phones append after the main one. Only metadata is
// cut out; the image data itself is untouched, so there's no quality loss.
//
// Returns null if the file can't be parsed, so the caller can fall back to
// redrawing it on a canvas (which also drops all metadata).
//
// `orientation` is the EXIF rotation flag (1 = upright). The flag is removed
// with the rest of the EXIF, so a caller that gets anything other than 1 should
// redraw the photo upright instead of using these bytes.

export interface StrippedImage {
  bytes: Uint8Array;
  orientation: number;
}

export const stripMetadata = (bytes: Uint8Array, mimeType: string): StrippedImage | null => {
  try {
    if (mimeType === 'image/jpeg') return stripJpeg(bytes);
    if (mimeType === 'image/png') return stripPng(bytes);
    if (mimeType === 'image/webp') return stripWebp(bytes);
  } catch {
    /* malformed: fall through */
  }
  return null;
};

const concat = (parts: Uint8Array[]): Uint8Array => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
};

const ascii = (b: Uint8Array, start: number, end: number) => String.fromCharCode(...b.subarray(start, end));

// --- JPEG ---

// Reads the Orientation tag (0x0112) from an APP1 "Exif" segment's payload.
const exifOrientation = (d: Uint8Array): number | null => {
  if (d.length < 14 || ascii(d, 0, 4) !== 'Exif') return null;
  const t = d.subarray(6); // TIFF header
  const le = t[0] === 0x49; // "II" little-endian, "MM" big-endian
  const u16 = (o: number) => (le ? t[o] | (t[o + 1] << 8) : (t[o] << 8) | t[o + 1]);
  const u32 = (o: number) =>
    (le ? t[o] | (t[o + 1] << 8) | (t[o + 2] << 16) | (t[o + 3] << 24) : (t[o] << 24) | (t[o + 1] << 16) | (t[o + 2] << 8) | t[o + 3]) >>> 0;
  const ifd = u32(4);
  if (ifd + 2 > t.length) return null;
  const count = u16(ifd);
  for (let k = 0; k < count; k++) {
    const e = ifd + 2 + k * 12;
    if (e + 12 > t.length) break;
    if (u16(e) === 0x0112) return u16(e + 8);
  }
  return null;
};

// Segments to drop: APP1 (EXIF, XMP), APP13 (IPTC), COM (comments), and APP2
// only when it's MPF (it points at appended images, which are dropped too).
// APP0 (JFIF), APP2 ICC color profiles and APP14 (Adobe color info) are kept.
const dropJpegSegment = (marker: number, seg: Uint8Array) =>
  marker === 0xe1 || marker === 0xed || marker === 0xfe || (marker === 0xe2 && ascii(seg, 4, 8) === 'MPF\0');

const stripJpeg = (b: Uint8Array): StrippedImage | null => {
  if (b[0] !== 0xff || b[1] !== 0xd8) return null;
  const parts: Uint8Array[] = [b.subarray(0, 2)];
  let orientation = 1;
  let i = 2;
  while (i + 1 < b.length) {
    if (b[i] !== 0xff) return null;
    const marker = b[i + 1];
    if (marker === 0xff) { i++; continue; } // fill byte
    if (marker === 0xd9) { // end of image: anything after it (appended images, trailers) is dropped
      parts.push(b.subarray(i, i + 2));
      return { bytes: concat(parts), orientation };
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { // markers with no length
      parts.push(b.subarray(i, i + 2));
      i += 2;
      continue;
    }
    if (i + 4 > b.length) return null;
    const len = (b[i + 2] << 8) | b[i + 3];
    const end = i + 2 + len;
    if (len < 2 || end > b.length) return null;
    const seg = b.subarray(i, end);

    if (marker === 0xda) {
      // Start of scan: the compressed data runs until the next real marker
      // (0xFF followed by something other than a stuffed 0x00 or a restart marker).
      let j = end;
      while (j + 1 < b.length && !(b[j] === 0xff && b[j + 1] !== 0x00 && !(b[j + 1] >= 0xd0 && b[j + 1] <= 0xd7))) j++;
      parts.push(b.subarray(i, j));
      i = j;
      continue;
    }

    if (marker === 0xe1) orientation = exifOrientation(seg.subarray(4)) ?? orientation;
    if (!dropJpegSegment(marker, seg)) parts.push(seg);
    i = end;
  }
  return null; // no end-of-image marker
};

// --- PNG ---

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
const PNG_DROP = new Set(['eXIf', 'tEXt', 'zTXt', 'iTXt', 'tIME']);

const stripPng = (b: Uint8Array): StrippedImage | null => {
  if (!PNG_SIGNATURE.every((v, k) => b[k] === v)) return null;
  const parts: Uint8Array[] = [b.subarray(0, 8)];
  let i = 8;
  while (i + 12 <= b.length) {
    const len = ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
    const type = ascii(b, i + 4, i + 8);
    const end = i + 12 + len;
    if (end > b.length) return null;
    if (!PNG_DROP.has(type)) parts.push(b.subarray(i, end));
    i = end;
    if (type === 'IEND') return { bytes: concat(parts), orientation: 1 };
  }
  return null;
};

// --- WebP ---

const stripWebp = (b: Uint8Array): StrippedImage | null => {
  if (ascii(b, 0, 4) !== 'RIFF' || ascii(b, 8, 12) !== 'WEBP') return null;
  const chunks: Uint8Array[] = [];
  let i = 12;
  while (i + 8 <= b.length) {
    const type = ascii(b, i, i + 4);
    const size = (b[i + 4] | (b[i + 5] << 8) | (b[i + 6] << 16) | (b[i + 7] << 24)) >>> 0;
    const end = i + 8 + size + (size & 1); // chunks are padded to an even length
    if (i + 8 + size > b.length) return null;
    const chunk = b.slice(i, Math.min(end, b.length));
    if (type === 'VP8X') chunk[8] &= ~(0x08 | 0x04); // clear the "has EXIF" and "has XMP" flags
    if (type !== 'EXIF' && type !== 'XMP ') chunks.push(chunk);
    i = end;
  }
  const body = concat(chunks);
  const out = new Uint8Array(12 + body.length);
  out.set(b.subarray(0, 12));
  out.set(body, 12);
  const riffSize = 4 + body.length;
  out[4] = riffSize & 0xff;
  out[5] = (riffSize >> 8) & 0xff;
  out[6] = (riffSize >> 16) & 0xff;
  out[7] = (riffSize >> 24) & 0xff;
  return { bytes: out, orientation: 1 };
};
