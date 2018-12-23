/* eslint-env node, mocha */

import { expect } from 'chai';
import * as bech32 from '../src';
// Test vectors mentioned in the BIP spec
import vectors from './vectors.json';

const { BitcoinAddress } = bech32;

/**
 * Bitcoin addresses use Bech32 in a peculiar way - script version is
 * not a part of the serialized binary data, but is rather prepended as 5-bit value
 * before the rest of the script. This necessitates some plumbing here.
 *
 * @param {string} prefix
 * @param {number} version
 * @param {Uint8Array} data
 * @returns {string}
 */
function encodeAddress(prefix, version, data) {
  const len = Math.ceil(data.length * 8 / 5);
  const converted = new Uint8Array(len + 1);
  converted[0] = version;
  bech32.to5BitArray(data, converted.subarray(1));
  return bech32.encode5BitArray(prefix, converted);
}

describe('bech32', () => {
  describe('encode', () => {
    vectors.validAddresses.forEach(({ address, script }) => {
      it(`should encode script "${script}" from test vectors`, () => {
        // Extract version from the script
        const prefix = address.substring(0, 2).toLowerCase();
        const scriptData = Buffer.from(script, 'hex');
        const version = scriptData[0] % 32;

        // First 2 bytes of the script are version and the script length,
        // respectively, so they are skipped with `.subarray(2)`.
        expect(encodeAddress(prefix, version, scriptData.subarray(2)))
          .to.equal(address.toLowerCase());
      });
    });

    it('should not encode an overly long message', () => {
      const prefix = 'test';
      const data = new Uint8Array(50);
      // 55 * 8 / 5 = 88 bytes; + 5 bytes for the prefix and separator

      expect(() => bech32.encode(prefix, data)).to.throw(/too long/i);
    });

    it('should not encode an overly long message with long prefix', () => {
      const prefix = 'testtesttesttesttesttesttesttesttesttesttesttesttesttesttest';
      const data = new Uint8Array(20);
      // 20 * 8 / 5 = 32 bytes; + 61 bytes for the prefix and separator

      expect(() => bech32.encode(prefix, data)).to.throw(/too long/i);
    });

    it('should not encode message with invalid chars in prefix', () => {
      const prefix = 'Ю';
      expect(() => bech32.encode(prefix, new Uint8Array(10))).to.throw(/invalid char/i);
    });
  });

  describe('decode', () => {
    vectors.validChecksums.forEach(({ encoded, hrp }) => {
      it(`should decode message with valid checksum "${encoded}"`, () => {
        expect(bech32.decode(encoded)).to.have.property('prefix', hrp);
      });
    });

    vectors.validAddresses.forEach(({ address, script }) => {
      it(`should decode address "${address}" from test vectors`, () => {
        const decoded = bech32.decodeTo5BitArray(address);
        expect(decoded.prefix).to.satisfy(hrp => hrp === 'bc' || hrp === 'tb');

        // Need to remove script version separately, hence `.subarray`
        const decScript = bech32.from5BitArray(decoded.data.subarray(1));

        expect(decScript).to.equalBytes(script.substring(4));
      });
    });

    vectors.invalidAddresses.forEach(({ address, reason }) => {
      it(`should detect problem with invalid test address "${address}"`, () => {
        expect(() => {
          const decoded = bech32.decodeTo5BitArray(address);
          bech32.from5BitArray(decoded.data.subarray(1));
        }).to.throw(new RegExp(reason, 'i'));
      });
    });

    vectors.invalidNonAddresses.forEach(({ data, reason }) => {
      it(`should detect problem with "${data}" for reason: ${reason}`, () => {
        expect(() => bech32.decode(data)).to.throw(new RegExp(reason, 'i'));
      });
    });
  });

  describe('BitcoinAddress', () => {
    it('should allow creating custom addresses', () => {
      const data = new Uint8Array(32);
      for (let i = 0; i < data.length; i += 1) {
        data[i] = i;
      }
      const address = new BitcoinAddress('bc', 0, data);
      expect(address.type()).to.equal('p2wsh');

      const encoded = address.encode();
      expect(encoded).to.match(/^bc1/);
      expect(BitcoinAddress.decode(encoded).data).to.equalBytes(data);
    });

    it('should disallow creating addresses with invalid scriptVersion', () => {
      const data = new Uint8Array(32);
      expect(() => new BitcoinAddress('bc', -1, data)).to.throw(RangeError);
      expect(() => new BitcoinAddress('bc', 17, data)).to.throw(RangeError);
    });

    it('should disallow unknown prefixes', () => {
      const data = new Uint8Array(32);
      expect(() => new BitcoinAddress('test', 1, data)).to.throw(/prefix/i);
    });

    it('should disallow overly short scripts', () => {
      const data = new Uint8Array(1);
      expect(() => new BitcoinAddress('tb', 1, data)).to.throw(/script length/i);
    });

    it('should disallow overly long scripts', () => {
      const data = new Uint8Array(41);
      expect(() => new BitcoinAddress('tb', 1, data)).to.throw(/script length/i);
    });

    it('should disallow invalid data lengths for v0 scripts', () => {
      const data = new Uint8Array(24);
      expect(() => new BitcoinAddress('tb', 0, data)).to.throw(/v0 script/i);
    });

    describe('decode', () => {
      vectors.validAddresses.forEach(({ address, script }) => {
        it(`should decode address "${address}" from test vectors`, () => {
          const decoded = BitcoinAddress.decode(address);
          const scriptData = Buffer.from(script, 'hex');
          const version = scriptData[0] % 32;

          expect(decoded.prefix).to.satisfy(prefix => prefix === 'tb' || prefix === 'bc');
          expect(decoded.scriptVersion).to.equal(version);
          expect(decoded.data).to.equalBytes(scriptData.subarray(2));
          expect(decoded.encode()).to.equal(address.toLowerCase());
        });
      });

      it('should fail to decode address with invalid prefix', () => {
        expect(() => BitcoinAddress.decode('abcdef1qpzry9x8gf2tvdw0s3jn54khce6mua7lmqqqxw')).to.throw(/prefix/i);
      });
    });

    describe('type', () => {
      vectors.validAddresses.forEach(({ address, type }) => {
        it(`should guess the type of address "${address}" (${type})`, () => {
          const decoded = BitcoinAddress.decode(address);
          expect(decoded.type()).to.equal(type);
        });
      });

      it('should return undefined for unknown v0 scripts', () => {
        const address = BitcoinAddress.decode('BC1QW508D6QEJXTDG4Y5R3ZARVARY0C5XW7KV8F3T4');
        address.data = new Uint8Array(36);
        expect(address.type()).to.equal(undefined);
      });
    });
  });
});
