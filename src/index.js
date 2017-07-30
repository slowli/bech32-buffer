/* @flow */

import { toBits, fromBits, createBitArray } from './bit-converter';
import type { BitArray } from './bit-converter';
import {
  expandPrefix,
  CHECKSUM_LENGTH,
  createChecksum,
  verifyChecksum,
  encode as base32Encode,
  decodeWithPrefix,
} from './encoding';

// Minimum char code that could be present in the encoded message
const MIN_CHAR_CODE = 33;
// Maximum char code that could be present in the encoded message
const MAX_CHAR_CODE = 126;
// Maximum encoded message length
const MAX_ENC_LENGTH = 90;

type FiveBitArray = BitArray<5>;

/**
 * Converts a Uint8Array into a Uint8Array variant, in which each element
 * encodes 5 bits of the original byte array.
 *
 * @param {Uint8Array} src
 *   Input to convert
 * @param {?Uint8Array} outBuffer
 *   Optional output buffer. If specified, the 5-bit sequence will be written there;
 *   if not specified, the output buffer will be created from scratch. The length
 *   of `outBuffer` is not checked.
 * @returns {Uint8Array}
 *   Output buffer with a 5-bit sequence
 *
 * @api public
 */
export function to5BitArray(src: Uint8Array, dst?: FiveBitArray): FiveBitArray {
  const len = Math.ceil(src.length * 8 / 5);
  const realDst: FiveBitArray = dst || createBitArray(len);

  return toBits(src, 5, realDst);
}

export function from5BitArray(src: FiveBitArray, dst?: Uint8Array): Uint8Array {
  const len = Math.floor(src.length * 5 / 8);
  const realDst = dst || new Uint8Array(len);

  return fromBits(src, 5, realDst);
}

/**
 * Encodes binary data into Bech32 encoding.
 *
 * Ordinarily, you may want to use [`encode`](#encode) because it converts
 * binary data to an array of 5-bit integers automatically.
 *
 * @param {string} prefix
 *   human-readable prefix to place at the beginning of the encoding
 * @param {Uint8Array} data
 *   array of 5-bit integers with data to encode
 * @returns {string}
 *   Bech32 encoding of data in the form `<prefix>1<base32 of data><checksum>`
 *
 * @api public
 */
export function encode5BitArray(prefix: string, data: FiveBitArray): string {
  // 1. Allocate buffer for all operations
  const len = 2 * prefix.length + 1 +  // expanded prefix
    data.length +                      // five-bit data encoding
    CHECKSUM_LENGTH;                   // checksum

  if (len - prefix.length > MAX_ENC_LENGTH) {
    throw new Error(`Message to be produced is too long (max ${MAX_ENC_LENGTH} supported)`);
  }

  for (let i = 0; i < prefix.length; i++) {
    const ord = prefix.charCodeAt(i);
    if (ord < MIN_CHAR_CODE || ord > MAX_CHAR_CODE) {
      throw new TypeError(`Invalid char in prefix: ${ord}; should be in ASCII range ${MIN_CHAR_CODE}-${MAX_CHAR_CODE}`);
    }
  }

  const buffer: FiveBitArray = createBitArray(len);

  // 2. Expand the human-readable prefix into the beginning of the buffer
  expandPrefix(prefix, buffer.subarray(0, 2 * prefix.length + 1));

  // 3. Copy `data` into the output
  const dataBuffer = buffer.subarray(2 * prefix.length + 1, buffer.length - CHECKSUM_LENGTH);
  dataBuffer.set(data);

  // 4. Create the checksum
  createChecksum(buffer);

  // 5. Convert into string
  const encoded = base32Encode(buffer.subarray(2 * prefix.length + 1));
  return `${prefix}1${encoded}`;
}

/**
 * Encodes binary data into Bech32 encoding.
 *
 * @param {string} prefix
 *   human-readable prefix to place at the beginning of the encoding
 * @param {Uint8Array} data
 *   binary data to encode
 * @returns {string}
 *   Bech32 encoding of data in the form `<prefix>1<base32 of data><checksum>`
 *
 * @api public
 */
export function encode(prefix: string, data: Uint8Array): string {
  return encode5BitArray(prefix, to5BitArray(data));
}

/**
 * Decodes data from Bech32 encoding into an array of 5-bit integers.
 *
 * Ordinarily, you may want to use [`decode`](#decode) because it automatically
 * converts the array of 5-bit integers into an ordinary `Uint8Array`.
 *
 * @param {string} message
 *   Bech32-encoded message
 * @returns {Object}
 *   Decoded object with `prefix` and `data` fields, which contain the human-readable
 *   prefix and the array of 5-bit integers respectively.
 *
 * @api public
 */
export function decodeTo5BitArray(message: string): { prefix: string, data: FiveBitArray } {
  // Check preconditions

  // 1. Message length
  if (message.length > MAX_ENC_LENGTH) {
    throw new TypeError(`Message too long; max ${MAX_ENC_LENGTH} expected`);
  }

  // 2. Mixed case
  let hasLowerCase = false;
  let hasUpperCase = false;
  for (let i = 0; i < message.length; i++) {
    const ord = message.charCodeAt(i);

    // 3. Allowed chars in the encoding
    if (ord < MIN_CHAR_CODE || ord > MAX_CHAR_CODE) {
      throw new TypeError(`Invalid char in message: ${ord}; should be in ASCII range ${MIN_CHAR_CODE}-${MAX_CHAR_CODE}`);
    }
    hasLowerCase = hasLowerCase || (ord >= 65 && ord <= 90);
    hasUpperCase = hasUpperCase || (ord >= 97 && ord <= 122);
  }
  if (hasLowerCase && hasUpperCase) {
    throw new TypeError('Mixed-case message');
  }

  const lowerCaseMsg = message.toLowerCase();

  // 4. Existence of the separator char
  const sepIdx = lowerCaseMsg.lastIndexOf('1');
  if (sepIdx < 0) {
    throw new Error('No separator char ("1") found');
  }

  // 5. Placing of the separator char in the message
  if (sepIdx > message.length - CHECKSUM_LENGTH - 1) {
    throw new Error(`Data part of the message too short (at least ${CHECKSUM_LENGTH} chars expected)`);
  }

  const prefix = lowerCaseMsg.substring(0, sepIdx);

  // Checked within `decodeWithPrefix`:
  // 6. Invalid chars in the data part of the message
  const bitArray = decodeWithPrefix(prefix, lowerCaseMsg.substring(sepIdx + 1));

  // 7. Checksum
  if (!verifyChecksum(bitArray)) {
    throw new Error('Invalid checksum');
  }

  return {
    prefix,
    // Strip off the prefix from the front and the checksum from the end
    data: bitArray.subarray(2 * prefix.length + 1, bitArray.length - CHECKSUM_LENGTH),
  };
}

/**
 * Decodes data from Bech32 encoding into an array of 5-bit integers.
 *
 * @param {string} message
 *   Bech32-encoded message
 * @returns {Object}
 *   Decoded object with `prefix` and `data` fields, which contain the human-readable
 *   prefix and the decoded binary data respectively.
 *
 * @api public
 */
export function decode(message: string): { prefix: string, data: Uint8Array } {
  const { prefix, data: bitArray } = decodeTo5BitArray(message);
  return { prefix, data: from5BitArray(bitArray) };
}
