/**
 * Escapes the LIKE/ILIKE wildcards (% and _) and the escape character, so a
 * user-typed value matches literally. ilike gives usernames the
 * case-insensitive match they need; without this "a_b" would also match "axb".
 */
export function literalLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}
