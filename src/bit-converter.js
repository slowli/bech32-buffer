/* @flow */

type BitsNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/* eslint-disable no-unused-vars */

/**
 * Virtual type for bit arrays, i.e., arrays in which each element contains
 * an integer in range `[0, 1 << L)`, where `1 <= L <= 8`.
 */
declare class BitArray_<L: BitsNumber> extends Uint8Array {
}
/* eslint-enable no-unused-vars */

export type BitArray<L: BitsNumber> = BitArray_<L>;

/**
 * Performs unchecked conversion from `Uint8Array` to `BitArray`.
 * This function is translated as the indentity operation by Babel; it's needed purely
 * for Flow type checks.
 *
 * @param {Uint8Array} src
 *   array to convert
 * @returns {Uint8Array}
 *   `src` interpreted as a `BitArray` with the specified bitness
 *
 * @api private
 */
function toBitArrayUnchecked<L: BitsNumber>(src: Uint8Array): BitArray<L> {
  return ((src: any): BitArray<L>);
}

/**
 * Creates a new array with specified bitness.
 *
 * @param {number} len
 *   length of the created array
 * @returns {Uint8Array}
 *
 * @api private
 */
export function createBitArray<L: BitsNumber>(len: number): BitArray<L> {
  return toBitArrayUnchecked(new Uint8Array(len));
}

/**
 * Converts an array from one number of bits per element to another.
 *
 * @api private
 */
function convert<IL: BitsNumber, OL: BitsNumber>(
  src: BitArray<IL>,
  srcBits: IL,
  dst: BitArray<OL>,
  dstBits: OL,
  pad: boolean,
): void {
  const mask = (1 << dstBits) - 1;

  let acc = 0;
  let bits = 0;
  let pos = 0;
  src.forEach((b) => {
    // Pull next bits from the input buffer into accumulator.
    acc = (acc << srcBits) + b;
    bits += srcBits;

    // Push into the output buffer while there are enough bits in the accumulator.
    while (bits >= dstBits) {
      bits -= dstBits;
      dst[pos] = (acc >> bits) & mask;
      pos += 1;
    }
  });

  if (pad) {
    if (bits > 0) {
      // `dstBits - rem.bits` is the number of trailing zero bits needed to be appended
      // to accumulator bits to get the trailing bit group.
      dst[pos] = (acc << (dstBits - bits)) & mask;
    }
  } else {
    // Truncate the remaining padding, but make sure that it is zeroed and not
    // overly long first.
    if (bits >= srcBits) {
      throw new Error(`Excessive padding: ${bits} (max ${srcBits - 1} allowed)`);
    }
    if (acc % (1 << bits) !== 0) {
      throw new Error('Non-zero padding');
    }
  }
}

/**
 * Encodes a `Uint8Array` buffer as an array with a lesser number of bits per element.
 *
 * @api private
 */
export function toBits<L: BitsNumber>(
  src: Uint8Array,
  bits: L,
  dst: BitArray<L>,
): BitArray<L> {
  if ((bits > 8) || (bits < 1)) {
    throw new RangeError('Invalid bits per element; 1 to 8 expected');
  }

  // `BitArray<8>` is equivalent to `Uint8Array`; unfortunately, Flow
  // has problems expressing this, so the explicit conversion is performed here.
  convert(toBitArrayUnchecked(src), 8, dst, bits, true);
  return dst;
}

export function fromBits<L: BitsNumber>(
  src: BitArray<L>,
  bits: L,
  dst: Uint8Array,
): Uint8Array {
  if ((bits > 8) || (bits < 1)) {
    throw new RangeError('Invalid bits per element; 1 to 8 expected');
  }

  convert(src, bits, toBitArrayUnchecked(dst), 8, false);
  return dst;
}
