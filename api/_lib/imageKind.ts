// Image type from the first bytes. Only PNG and JPEG can be drawn into a share card.
export const imageKind = (b: Uint8Array): 'image/png' | 'image/jpeg' | null =>
  b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 ? 'image/png'
    : b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff ? 'image/jpeg'
      : null;
