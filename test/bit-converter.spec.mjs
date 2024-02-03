/* eslint-env mocha */

import * as chai from 'chai';
import chaiBytes from 'chai-bytes';

// This awkwardness is required because of difference in transpiling modules for unit
// and browser tests. Unit tests transpile source files into CommonJS modules
// with only the default export exposed.
let bitConverter = await import('../src/bit-converter.js');
if (typeof bitConverter.default === 'object') {
  bitConverter = bitConverter.default;
}
const { toBits, fromBits } = bitConverter;
const { expect } = chai.use(chaiBytes);

describe('bit-converter', () => {
  describe('toBits', () => {
    it('should convert a single byte to 1-bit array', () => {
      const input = new Uint8Array([42]);
      const output = new Uint8Array(8);

      expect(toBits(input, 1, output)).to.equalBytes([0, 0, 1, 0, 1, 0, 1, 0]);
    });

    it('should convert a single byte to 4-bit array', () => {
      const input = new Uint8Array([42]);
      const output = new Uint8Array(2);

      expect(toBits(input, 4, output)).to.equalBytes([2, 10]);
    });

    it('should convert a single byte to 5-bit array', () => {
      const input = new Uint8Array([42]);
      // Bits (2 padding bits in parentheses):
      // 00101'010 (00)
      const output = new Uint8Array(2);

      expect(toBits(input, 5, output)).to.equalBytes([5, 8]);
    });

    it('should not write beyond necessary number of elements', () => {
      const input = new Uint8Array([42]);
      const output = new Uint8Array(5);

      expect(toBits(input, 5, output)).to.equalBytes([5, 8, 0, 0, 0]);
    });

    it('should work with no padding', () => {
      const input = new Uint8Array([1, 2, 3, 4, 5]);
      // Bits:
      // 00000'001 00'00001'0 0000'0011 0'00001'00 000'00101
      const output = new Uint8Array(8);
      expect(toBits(input, 5, output)).to.equalBytes([0, 4, 1, 0, 6, 1, 0, 5]);
    });

    it('should work with padding for multi-byte arrays', () => {
      const input = new Uint8Array([127, 43]);
      // Bits:
      // 01111'111 00'10101'1 (0000)
      const output = new Uint8Array(4);
      expect(toBits(input, 5, output)).to.equalBytes([15, 28, 21, 16]);
    });

    it('should throw on large bit length', () => {
      expect(() => toBits(new Uint8Array(1), 9, new Uint8Array(1)))
        .to.throw(RangeError);
    });

    it('should throw on small bit length', () => {
      expect(() => toBits(new Uint8Array(1), 0, new Uint8Array(1)))
        .to.throw(RangeError);
    });
  });

  describe('fromBits', () => {
    it('should convert a 5-bit array into a single byte', () => {
      const input = new Uint8Array([5, 8]);
      // Bits (2 padding bits in parentheses):
      // 00101'010 (00)
      const output = new Uint8Array(1);

      expect(fromBits(input, 5, output)).to.equalBytes([42]);
    });

    it('should convert a 5-bit array into multiple bytes', () => {
      const input = new Uint8Array([15, 28, 21, 16]);
      // Bits:
      // 01111'111 00'10101'1 (0000)
      const output = new Uint8Array(2);
      expect(fromBits(input, 5, output)).to.equalBytes([127, 43]);
    });

    it('should throw on too long padding', () => {
      const input = new Uint8Array([15, 28, 0]);
      // The input is 15 bits, i.e., a single complete byte + 7-bit padding.
      // This padding is excessive, because the last 5-bit component
      // is completely ignored.

      const output = new Uint8Array(1);
      expect(() => fromBits(input, 5, output)).to.throw(/excessive.*padding/i);
    });

    it('should throw on non-zero padding', () => {
      const input = new Uint8Array([15, 28, 21, 17]);
      const output = new Uint8Array(2);
      expect(() => fromBits(input, 5, output)).to.throw(/non-zero.*padding/i);
    });

    it('should throw on large bit length', () => {
      expect(() => fromBits(new Uint8Array(1), 9, new Uint8Array(1)))
        .to.throw(RangeError);
    });

    it('should throw on small bit length', () => {
      expect(() => fromBits(new Uint8Array(1), 0, new Uint8Array(1)))
        .to.throw(RangeError);
    });
  });
});
