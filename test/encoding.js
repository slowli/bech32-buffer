/* eslint-env node, mocha */

import * as chai from 'chai';
import chaiBytes from 'chai-bytes';
import {
  expandPrefix,
  CHECKSUM_LENGTH,
  createChecksum,
  verifyChecksum,
  encode,
  decode,
} from '../src/encoding';
import { toBits } from '../src/bit-converter';

const { expect } = chai.use(chaiBytes);

describe('Bech32 low-level encoding', () => {
  describe('CHECKSUM_LENGTH', () => {
    it('should be equal to 6', () => {
      expect(CHECKSUM_LENGTH).to.equal(6);
    });
  });

  describe('expandPrefix', () => {
    it('should expand an empty prefix to a single zero bit group', () => {
      const buffer = new Uint8Array(1);
      expandPrefix('', buffer);
      expect(buffer).to.equalBytes('00');
    });

    it('should expand a "bc" prefix to a 5-byte group', () => {
      const buffer = new Uint8Array(5);
      expandPrefix('bc', buffer);
      // bc === 0x62 0x63
      expect(buffer).to.equalBytes('0303000203');
    });
  });

  describe('createChecksum', () => {
    it('should create a checksum for a short test vector', () => {
      const buffer = new Uint8Array([
        3, 3, 0, 2, 3, // the encoded `bc` prefix
        16, // script version
        0, 0, 0, 0, // script data placeholder
        0, 0, 0, 0, 0, 0, // placeholder for the checksum
      ]);

      // Fill the script data, `ceil(16 / 5) = 4` bytes
      toBits(new Uint8Array([0x75, 0x1e]), 5, buffer.subarray(6, 10));

      createChecksum(buffer);
      expect(buffer.subarray(buffer.length - 6)).to.equalBytes([29, 17, 18, 6, 17, 16]);
    });
  });

  describe('verifyChecksum', () => {
    it('should create a checksum for a short test vector', () => {
      const buffer = new Uint8Array([
        3, 3, 0, 2, 3, // the encoded `bc` prefix
        16, // script version
        0, 0, 0, 0, // script data placeholder
        29, 17, 18, 6, 17, 16, // checksum
      ]);

      // Fill the script data, `ceil(16 / 5) = 4` bytes
      toBits(new Uint8Array([0x75, 0x1e]), 5, buffer.subarray(6, 10));

      expect(buffer).to.satisfy(verifyChecksum);
    });
  });

  describe('encode', () => {
    it('should encode a zero array', () => {
      const buffer = new Uint8Array(8);
      expect(encode(buffer)).to.equal('qqqqqqqq');
    });

    it('should encode a short array', () => {
      const buffer = new Uint8Array([4, 8, 15, 16, 23]);
      expect(encode(buffer)).to.equal('yg0sh');
    });
  });

  describe('decode', () => {
    it('should decode a short array', () => {
      expect(decode('yg0sh')).to.equalBytes([4, 8, 15, 16, 23]);
    });
  });
});
