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
  const max = (1 << dstBits) - 1;

  const rem = Array.prototype.reduce.call(src, ({ acc, bits, pos }, b) => {
    // Pull next bits from the input buffer into accumulator
    const acc_ = (acc << srcBits) + b;
    let bits_ = bits + srcBits;
    let pos_ = pos;

    // Push into the output buffer while there are enough bits in the accumulator
    while (bits_ >= dstBits) {
      bits_ -= dstBits;
      dst[pos_] = (acc_ >> bits_) & max;
      pos_ += 1;
    }

    return { acc: acc_, bits: bits_, pos: pos_ };
  }, { acc: 0, bits: 0, pos: 0 });

  if (pad) {
    if (rem.bits > 0) {
      // `dstBits - rem.bits` is the number of trailing zero bits needed to be appended
      // to accumulator bits to get the trailing bit group
      dst[rem.pos] = (rem.acc << (dstBits - rem.bits)) & max;
    }
  } else {
    // Truncate the remaining padding, but make sure that it is zeroed and not
    // overly long first
    if (rem.bits >= srcBits) {
      throw new Error(`Excessive padding: ${rem.bits} (max ${srcBits - 1} allowed)`);
    }
    if (rem.acc % (1 << rem.bits) !== 0) {
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
  // has problems expressing this, so the explicit coversion is performed here
  convert(((src: any): BitArray<8>), 8, dst, bits, true);
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

  convert(src, bits, ((dst: any): BitArray<8>), 8, false);
  return dst;
}
