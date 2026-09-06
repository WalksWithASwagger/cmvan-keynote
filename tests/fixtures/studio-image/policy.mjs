export const limits = { bytes: 8 * 1024 * 1024, pixels: 12_000_000, edge: 6000, normalizedEdge: 1600 };

export function admission({ type, size, width, height }) {
  if (!['image/png', 'image/jpeg'].includes(type)) return 'Use a PNG or JPEG image.';
  if (!Number.isFinite(size) || size <= 0) return 'This image could not be read. Try another PNG or JPEG.';
  if (size > limits.bytes) return 'Choose an image smaller than 8 MiB.';
  if (![width, height].every(n => Number.isInteger(n) && n > 0)) return 'This image could not be read. Try another PNG or JPEG.';
  if (width > limits.edge || height > limits.edge || width * height > limits.pixels) return 'Resize this image to at most 12 megapixels and 6000 pixels per side.';
  return null;
}

export function normalizedSize(width, height) {
  const scale = Math.min(1, limits.normalizedEdge / Math.max(width, height));
  return [Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale))];
}

export function stripPngMetadata(bytes) {
  const pieces = [bytes.slice(0,8)];
  for (let offset=8; offset<bytes.length;) {
    if (offset+12>bytes.length) throw Error('Truncated PNG chunk');
    const length=new DataView(bytes.buffer,bytes.byteOffset+offset,4).getUint32(0);
    if (offset+length+12>bytes.length) throw Error('Truncated PNG data');
    const type=String.fromCharCode(...bytes.slice(offset+4,offset+8));
    if (!['eXIf','tEXt','iTXt','zTXt'].includes(type)) pieces.push(bytes.slice(offset,offset+length+12));
    offset+=length+12;
  }
  const result=new Uint8Array(pieces.reduce((n,p)=>n+p.length,0));let offset=0;
  for(const piece of pieces){result.set(piece,offset);offset+=piece.length;}
  return result;
}
