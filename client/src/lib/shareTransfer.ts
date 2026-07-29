const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export function encodeShareTransferData(payload: string): string {
  const bytes = textEncoder.encode(payload);
  const binary = Array.from(bytes, byte => String.fromCharCode(byte)).join("");
  return btoa(binary);
}

export function decodeShareTransferData(value: string): string {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  return textDecoder.decode(bytes);
}
