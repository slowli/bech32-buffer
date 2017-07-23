/* @flow */

import assert from 'assert';
import type { BitArray } from './bit-converter';

type FiveBitArray = BitArray<5>;

// Alphabet for Bech32
const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';

export const CHECKSUM_LENGTH = 6;

interface Lookup<K, V> {
  get(key: K): V | void;
  set(key: K, value: V): Lookup<K, V>;
}

// Reverse lookup for characters
const CHAR_LOOKUP = (() => {
  const lookup: Lookup<string, number> = typeof Map !== 'undefined' ? new Map() : {
    _map: {},

    get(i: string): number {
      return this._map[i];
    },

    set(i: string, v: number) {
      this._map[i] = v;
      return this;
    },
  };

  for (let i = 0; i < CHARSET.length; i++) {
    lookup.set(CHARSET[i], i);
  }

  return lookup;
})();

// Poly generators
const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];

function polymod(values: FiveBitArray): number {
  let chk = 1;

  values.forEach((v) => {
    const b = (chk >> 25);
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < GEN.length; i++) {
      if (((b >> i) & 1) === 1) chk ^= GEN[i];
    }
  });

  return chk;
}

/**
 * Expands a prefix onto the specified output buffer.
 */
export function expandPrefix(prefix: string, outBuffer: FiveBitArray): void {
  assert(outBuffer.length === 2 * prefix.length + 1);

  for (let i = 0; i < prefix.length; i++) {
    const code = prefix.charCodeAt(i);
    outBuffer[i] = code >> 5;
    outBuffer[i + prefix.length + 1] = code & 31;
  }
  outBuffer[prefix.length] = 0;
}

/**
 * Verifies the checksum for a particular buffer
 */
export function verifyChecksum(buffer: FiveBitArray): boolean {
  return polymod(buffer) === 1;
}

/**
 * Creates a checksum for a buffer and writes it to the last 6 5-bit groups
 * of the buffer.
 */
export function createChecksum(buffer: FiveBitArray): void {
  const mod = polymod(buffer) ^ 1;
  for (let i = 0; i < CHECKSUM_LENGTH; i++) {
    buffer[buffer.length - CHECKSUM_LENGTH + i] = (mod >> (5 * (5 - i))) & 31;
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
  return Array.prototype.reduce.call(buffer, (acc, bits) => acc + CHARSET[bits], '');
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
  const realDst = dst || ((new Uint8Array(message.length): any): FiveBitArray);
  for (let i = 0; i < message.length; i++) {
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
  const dst = ((new Uint8Array(len): any): FiveBitArray);

  expandPrefix(prefix, dst.subarray(0, 2 * prefix.length + 1));
  decode(message, dst.subarray(2 * prefix.length + 1));

  return dst;
}
