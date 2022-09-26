/* eslint-env node, mocha */

import * as chai from 'chai';
import chaiBytes from 'chai-bytes';
import dirtyChai from 'dirty-chai';

import {
  expandPrefix,
  CHECKSUM_LENGTH,
  createChecksum,
  verifyChecksum,
  encode,
  decode,
  detectCase,
} from '../src/encoding';
import { toBits } from '../src/bit-converter';

const { expect } = chai.use(chaiBytes).use(dirtyChai);

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

  const SHORT_ARRAY_CHECKSUMS = {
    bech32: [29, 17, 18, 6, 17, 16],
    bech32m: [8, 13, 2, 10, 20, 18],
  };

  describe('createChecksum', () => {
    Object.entries(SHORT_ARRAY_CHECKSUMS).forEach(([encoding, checksum]) => {
      it(`should create a checksum for a short test vector with ${encoding}`, () => {
        const buffer = new Uint8Array([
          3, 3, 0, 2, 3, // the encoded `bc` prefix
          16, // script version
          0, 0, 0, 0, // script data placeholder
          0, 0, 0, 0, 0, 0, // placeholder for the checksum
        ]);

        // Fill the script data, `ceil(16 / 5) = 4` bytes
        toBits(new Uint8Array([0x75, 0x1e]), 5, buffer.subarray(6, 10));

        createChecksum(buffer, encoding);
        expect(buffer.subarray(buffer.length - 6)).to.equalBytes(checksum);
      });
    });
  });

  describe('verifyChecksum', () => {
    Object.entries(SHORT_ARRAY_CHECKSUMS).forEach(([encoding, checksum]) => {
      it(`should verify checksum for a short test vector with ${encoding}`, () => {
        const buffer = new Uint8Array([
          3, 3, 0, 2, 3, // the encoded `bc` prefix
          16, // script version
          0, 0, 0, 0, // script data placeholder
          0, 0, 0, 0, 0, 0, // placeholder for the checksum
        ]);
        buffer.set(checksum, buffer.length - 6);

        // Fill the script data, `ceil(16 / 5) = 4` bytes
        toBits(new Uint8Array([0x75, 0x1e]), 5, buffer.subarray(6, 10));

        expect(verifyChecksum(buffer)).to.equal(encoding);
      });
    });
  });

  describe('encode', () => {
    it('should encode a array', () => {
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

  describe('detectCase', () => {
    it('should detect lowercase message', () => {
      expect(detectCase('test')).to.equal('lower');
      expect(detectCase('t3st@')).to.equal('lower');
    });

    it('should detect uppercase message', () => {
      expect(detectCase('TEST')).to.equal('upper');
      expect(detectCase('T3ST@')).to.equal('upper');
    });

    it('should return null on no-case message', () => {
      expect(detectCase('1337')).to.be.null();
    });

    it('should error on mixed-case', () => {
      expect(() => detectCase('Test')).to.throw(/Mixed-case message/);
    });

    it('should error on invalid char', () => {
      expect(() => detectCase('тест')).to.throw(/Invalid char in message/);
    });
  });
});
