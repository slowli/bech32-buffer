/* eslint-env node, mocha */

import { expect } from 'chai';
import * as bech32 from '../src';
// Test vectors mentioned in the BIP spec
import vectors from './vectors.json';

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
        const version = scriptData[0] & 31;

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
});
