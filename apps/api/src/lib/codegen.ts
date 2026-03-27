import { BASE62_ALPHABET, SHORT_CODE_LENGTH } from "@qurl/shared";

export function generateShortCode(): string {
  const bytes = new Uint8Array(SHORT_CODE_LENGTH);
  crypto.getRandomValues(bytes);

  let code = "";
  for (let i = 0; i < SHORT_CODE_LENGTH; i++) {
    code += BASE62_ALPHABET[bytes[i] % BASE62_ALPHABET.length];
  }
  return code;
}
