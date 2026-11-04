import { readFile } from 'node:fs/promises';
export const EncodingType = { Base64: 'base64' };
export async function readAsStringAsync(uri) {
  return (await readFile(new URL(uri))).toString('base64');
}
