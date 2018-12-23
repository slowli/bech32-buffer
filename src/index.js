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
 * @param {?Uint8Array} dst
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
  const realDst = dst || createBitArray(len);

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
  const len = 2 * prefix.length + 1 // expanded prefix
    + data.length // five-bit data encoding
    + CHECKSUM_LENGTH; // checksum

  if (len - prefix.length > MAX_ENC_LENGTH) {
    throw new Error(`Message to be produced is too long (max ${MAX_ENC_LENGTH} supported)`);
  }

  for (let i = 0; i < prefix.length; i += 1) {
    const ord = prefix.charCodeAt(i);
    if (ord < MIN_CHAR_CODE || ord > MAX_CHAR_CODE) {
      throw new TypeError(`Invalid char in prefix: ${ord}; should be in ASCII range ${MIN_CHAR_CODE}-${MAX_CHAR_CODE}`);
    }
  }

  const buffer = createBitArray(len);

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
  for (let i = 0; i < message.length; i += 1) {
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

/**
 * Bitcoin address.
 */
export class BitcoinAddress {
  /**
   * Human-readable prefix. Equal to `'bc'` (for mainnet addresses)
   * or `'tb'` (for testnet addresses).
   */
  prefix: 'bc' | 'tb';

  /**
   * Script version. An integer between 0 and 16 (inclusive).
   */
  scriptVersion: number;

  /**
   * Script data. A byte string with length 2 to 40 (inclusive).
   */
  data: Uint8Array;

  /**
   * Decodes a Bitcoin address from a Bech32 string.
   * This method does not check whether the address is well-formed;
   * use `type()` method on returned address to find that out.
   *
   * @param {string} message
   * @returns {BitcoinAddress}
   */
  static decode(message: string): BitcoinAddress {
    const { prefix, data } = decodeTo5BitArray(message);
    // Extra check to satisfy Flow.
    if (prefix !== 'bc' && prefix !== 'tb') {
      throw new Error('Invalid human-readable prefix, "bc" or "tb" expected');
    }
    return new this(prefix, data[0], from5BitArray(data.subarray(1)));
  }

  constructor(prefix: 'bc' | 'tb', scriptVersion: number, data: Uint8Array) {
    if (prefix !== 'bc' && prefix !== 'tb') {
      throw new Error('Invalid human-readable prefix, "bc" or "tb" expected');
    }
    if ((scriptVersion < 0) || (scriptVersion > 16)) {
      throw new RangeError('Invalid scriptVersion, value in range [0, 16] expected');
    }
    if (data.length < 2 || data.length > 40) {
      throw new RangeError('Invalid script length: expected 2 to 40 bytes');
    }
    if ((scriptVersion === 0) && (data.length !== 20 && data.length !== 32)) {
      throw new Error('Invalid v0 script length: expected 20 or 32 bytes');
    }

    this.prefix = prefix;
    this.scriptVersion = scriptVersion;
    this.data = data;
  }

  /**
   * Guesses the address type based on its internal structure.
   *
   * @returns {void | 'p2wpkh' | 'p2wsh'}
   */
  type(): void | 'p2wpkh' | 'p2wsh' {
    if (this.scriptVersion !== 0) {
      return undefined;
    }

    switch (this.data.length) {
      case 20: return 'p2wpkh';
      case 32: return 'p2wsh';

      // should be unreachable, but it's JS, so you never know
      default: return undefined;
    }
  }

  /**
   * Encodes this address in Bech32 format.
   *
   * @returns {string}
   *   Bech32-encoded address
   */
  encode(): string {
    // Bitcoin addresses use Bech32 in a peculiar way - script version is
    // not a part of the serialized binary data, but is rather prepended as 5-bit value
    // before the rest of the script. This necessitates some plumbing here.
    const len = Math.ceil(this.data.length * 8 / 5);
    const converted: FiveBitArray = createBitArray(len + 1);
    converted[0] = this.scriptVersion;
    to5BitArray(this.data, converted.subarray(1));
    return encode5BitArray(this.prefix, converted);
  }
}
