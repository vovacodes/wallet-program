const ALPHABET =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export function createUid(): string {
  return Array.from({ length: 6 }, () =>
    ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length))
  ).join("");
}
