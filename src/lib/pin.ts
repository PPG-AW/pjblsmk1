import { randomInt } from "node:crypto";

/** Alfabet PIN tanpa karakter ambigu (0/O, 1/I/L). */
export const PIN_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const PIN_LENGTH = 6;

export function generatePin(length = PIN_LENGTH): string {
  let pin = "";
  for (let i = 0; i < length; i += 1) {
    pin += PIN_ALPHABET[randomInt(0, PIN_ALPHABET.length)];
  }
  return pin;
}
