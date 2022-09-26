/* @flow */

import { createBitArray } from './bit-converter';
import type { BitArray } from './bit-converter';

type FiveBitArray = BitArray<5>;

/** Encoding variation. Influences checksum computations. */
export type Encoding = 'bech32' | 'bech32m';

// Alphabet for Bech32
const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
// Checksum constant for Bech32m.
const BECH32M_CHECKSUM = 0x2bc830a3;
// Minimum char code that could be present in the encoded message
const MIN_CHAR_CODE = 33;
// Maximum char code that could be present in the encoded message
const MAX_CHAR_CODE = 126;

export const CHECKSUM_LENGTH = 6;

// Reverse lookup for characters
const CHAR_LOOKUP = (() => {
  const lookup = new Map();
  for (let i = 0; i < CHARSET.length; i += 1) {
    lookup.set(CHARSET[i], i);
  }
  return lookup;
})();

// Poly generators
const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];

function polymod(values: FiveBitArray): number {
  return values.reduce((checksum, value) => {
    const bits = checksum >> 25;
    const newChecksum = ((checksum & 0x1ffffff) << 5) ^ value;
    return GEN.reduce(
      (chk, gen, i) => (((bits >> i) & 1) === 0 ? chk : (chk ^ gen)),
      newChecksum,
    );
  }, /* initial checksum */ 1);
}

/**
 * Expands a prefix into the specified output buffer.
 */
export function expandPrefix(prefix: string, outBuffer: FiveBitArray): void {
  for (let i = 0; i < prefix.length; i += 1) {
    const code = prefix.charCodeAt(i);
    outBuffer[i] = code >> 5;
    outBuffer[i + prefix.length + 1] = code & 31;
  }
  outBuffer[prefix.length] = 0;
}

/**
 * Verifies the checksum for a particular buffer.
 */
export function verifyChecksum(buffer: FiveBitArray): Encoding | void {
  switch (polymod(buffer)) {
    case 1:
      return 'bech32';
    case BECH32M_CHECKSUM:
      return 'bech32m';
    default:
      return undefined;
  }
}

/**
 * Creates a checksum for a buffer and writes it to the last 6 5-bit groups
 * of the buffer.
 */
export function createChecksum(buffer: FiveBitArray, encoding: Encoding): void {
  let checksumConstant;
  switch (encoding) {
    case 'bech32':
      checksumConstant = 1; break;
    case 'bech32m':
      checksumConstant = BECH32M_CHECKSUM; break;
    default:
      throw Error(`Invalid encoding value: ${encoding}; expected bech32 or bech32m`);
  }

  const mod = polymod(buffer) ^ checksumConstant;
  for (let i = 0; i < CHECKSUM_LENGTH; i += 1) {
    const shift = 5 * (5 - i);
    buffer[buffer.length - CHECKSUM_LENGTH + i] = (mod >> shift) & 31;
  }
}

/**
 * Encodes an array of 5-bit groups into a string.
 *
 * @param {Uint8Array} buffer
 * @returns {string}
 *
 * @api private
 */
export function encode(buffer: FiveBitArray): string {
  return buffer.reduce((acc, bits) => acc + CHARSET[bits], '');
}

/**
 * Decodes a string into an array of 5-bit groups.
 *
 * @param {string} message
 * @param {Uint8Array} [dst]
 *   Optional array to write the output to. If not specified, the array is created.
 * @returns {Uint8Array}
 *   Array with the result of decoding
 *
 * @throws {Error}
 *   if there are characters in `message` not present in the encoding alphabet
 *
 * @api private
 */
export function decode(message: string, dst?: FiveBitArray): FiveBitArray {
  const realDst = dst || createBitArray(message.length);
  for (let i = 0; i < message.length; i += 1) {
    const idx = CHAR_LOOKUP.get(message[i]);
    if (idx === undefined) {
      throw new Error(`Invalid char in message: ${message[i]}`);
    }
    realDst[i] = idx;
  }
  return realDst;
}

/**
 * Decodes a string and a human-readable prefix into an array of 5-bit groups.
 * The prefix is expanded as specified by Bech32.
 *
 * @param {string} prefix
 * @param {string} message
 * @returns {Uint8Array}
 *   Array with the result of decoding
 *
 * @api private
 */
export function decodeWithPrefix(prefix: string, message: string): FiveBitArray {
  const len = message.length + 2 * prefix.length + 1;
  const dst = createBitArray(len);

  expandPrefix(prefix, dst.subarray(0, 2 * prefix.length + 1));
  decode(message, dst.subarray(2 * prefix.length + 1));

  return dst;
}

/**
 * Detects the character case used in `message`. If the message doesn't
 * contain either lower-case or upper-case chars, returns `null`.
 *
 * @param {string} message
 * @param {string} messageDescription
 *   Human-readable description of the message to put into an error message, should any occur
 * @returns {'lower'|'upper'|null}
 * @throws if the message contains both lowercase and uppercase chars,
 *   or contains chars not valid for Bech32(m) encoding
 */
export function detectCase(
  message: string,
  messageDescription: string = 'message',
): 'lower' | 'upper' | null {
  let hasLowerCase = false;
  let hasUpperCase = false;
  for (let i = 0; i < message.length; i += 1) {
    const ord = message.charCodeAt(i);

    // 3. Allowed chars in the encoding
    if (ord < MIN_CHAR_CODE || ord > MAX_CHAR_CODE) {
      throw new TypeError(`Invalid char in ${messageDescription}: ${ord}; `
        + `should be in ASCII range ${MIN_CHAR_CODE}-${MAX_CHAR_CODE}`);
    }
    hasUpperCase = hasUpperCase || (ord >= 65 && ord <= 90);
    hasLowerCase = hasLowerCase || (ord >= 97 && ord <= 122);
  }
  if (hasLowerCase && hasUpperCase) {
    throw new TypeError(`Mixed-case ${messageDescription}`);
  } else if (hasUpperCase) {
    return 'upper';
  } else if (hasLowerCase) {
    return 'lower';
  } else {
    return null;
  }
}
