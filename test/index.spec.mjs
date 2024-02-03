/* eslint-env mocha */

import * as chai from 'chai';
import chaiBytes from 'chai-bytes';

// This awkwardness is required because of difference in transpiling modules for unit
// and browser tests. Unit tests transpile source files into CommonJS modules
// with only the default export exposed.
let bech32 = await import('../src/index.js');
if (typeof bech32.default === 'object') {
  bech32 = bech32.default;
}
const { BitcoinAddress } = bech32;
const { expect } = chai.use(chaiBytes);

function decodeHex(hexString) {
  if (typeof hexString !== 'string') {
    throw new TypeError('expected a hex string');
  }
  if (hexString.length % 2 !== 0) {
    throw new TypeError('hex string length must be even');
  }

  const buffer = new Uint8Array(hexString.length / 2);
  for (let i = 0; i < hexString.length; i += 2) {
    const digit = hexString.substring(i, i + 2);
    buffer[i / 2] = Number.parseInt(digit, 16);
  }
  return buffer;
}

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
  const len = Math.ceil((data.length * 8) / 5);
  const converted = new Uint8Array(len + 1);
  converted[0] = version;
  bech32.to5BitArray(data, converted.subarray(1));
  return bech32.encode5BitArray(prefix, converted);
}

const vectors = {
  validAddresses: [
    {
      script: '0014751e76e8199196d454941c45d1b3a323f1433bd6',
      address: 'BC1QW508D6QEJXTDG4Y5R3ZARVARY0C5XW7KV8F3T4',
      type: 'p2wpkh',
    },
    {
      script: '00201863143c14c5166804bd19203356da136c985678cd4d27a1b8c6329604903262',
      address: 'tb1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3q0sl5k7',
      type: 'p2wsh',
    },
    {
      script: '8128751e76e8199196d454941c45d1b3a323f1433bd6751e76e8199196d454941c45d1b3a323f1433bd6',
      address: 'bc1pw508d6qejxtdg4y5r3zarvary0c5xw7kw508d6qejxtdg4y5r3zarvary0c5xw7k7grplx',
      bech32mAddress: 'bc1pw508d6qejxtdg4y5r3zarvary0c5xw7kw508d6qejxtdg4y5r3zarvary0c5xw7kt5nd6y',
    },
    {
      script: '9002751e',
      address: 'BC1SW50QA3JX3S',
      bech32mAddress: 'BC1SW50QGDZ25J',
    },
    {
      script: '8210751e76e8199196d454941c45d1b3a323',
      address: 'bc1zw508d6qejxtdg4y5r3zarvaryvg6kdaj',
      bech32mAddress: 'bc1zw508d6qejxtdg4y5r3zarvaryvaxxpcs',
    },
    {
      script: '0020000000c4a5cad46221b2a187905e5266362b99d5e91c6ce24d165dab93e86433',
      address: 'tb1qqqqqp399et2xygdj5xreqhjjvcmzhxw4aywxecjdzew6hylgvsesrxh6hy',
      type: 'p2wsh',
    },
  ],
  validChecksums: [
    {
      encoded: 'A12UEL5L',
      hrp: 'a',
    },
    {
      encoded: 'an83characterlonghumanreadablepartthatcontainsthenumber1andtheexcludedcharactersbio1tt5tgs',
      hrp: 'an83characterlonghumanreadablepartthatcontainsthenumber1andtheexcludedcharactersbio',
    },
    {
      encoded: 'abcdef1qpzry9x8gf2tvdw0s3jn54khce6mua7lmqqqxw',
      hrp: 'abcdef',
    },
    {
      encoded: '11qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqc8247j',
      hrp: '1',
    },
    {
      encoded: 'split1checkupstagehandshakeupstreamerranterredcaperred2y9e3w',
      hrp: 'split',
    },
  ],
  validBech32mChecksums: [
    {
      encoded: 'A1LQFN3A',
      hrp: 'a',
    },
    {
      encoded: 'an83characterlonghumanreadablepartthatcontainsthetheexcludedcharactersbioandnumber11sg7hg6',
      hrp: 'an83characterlonghumanreadablepartthatcontainsthetheexcludedcharactersbioandnumber1',
    },
    {
      encoded: 'abcdef1l7aum6echk45nj3s0wdvt2fg8x9yrzpqzd3ryx',
      hrp: 'abcdef',
    },
    {
      encoded: 'split1checkupstagehandshakeupstreamerranterredcaperredlc445v',
      hrp: 'split',
    },
    {
      encoded: '?1v759aa',
      hrp: '?',
    },
  ],
  invalidAddresses: [
    {
      address: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t5',
      reason: 'checksum',
    },
    {
      address: 'tb1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3q0sL5k7',
      reason: 'mixed-case',
    },
    {
      address: 'tb1pw508d6qejxtdg4y5r3zarqfsj6c3',
      reason: 'excessive padding',
    },
    {
      address: 'tb1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3pjxtptv',
      reason: 'non-zero padding',
    },
  ],
  invalidNonAddresses: [
    {
      data: 'bc1',
      reason: 'too short',
    },
    {
      data: 'bc1sj6c3',
      reason: 'too short',
    },
    {
      data: 'tb1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3pjxtptv4nce4xj0gdcccefvpysxf3pjxtptv',
      reason: 'too long',
    },
    {
      data: 'bcfsj6c3',
      reason: 'no separator',
    },
    {
      data: 'Ю1pw508d6qejxtdg4y5r3zarqfsj6c3',
      reason: 'invalid char',
      comment: "Invalid char is 'Ю' in the human-readable part",
    },
    {
      data: 'tb1pw508d6qejxtdg4y5r3zabqfsj6c3',
      reason: 'invalid char',
      comment: "Differs from the previous vector; the invalid char is 'b' in the data part",
    },
  ],
};

describe('bech32', () => {
  describe('encode', () => {
    vectors.validAddresses.forEach(({ address, script }) => {
      it(`should encode script "${script}" from test vectors`, () => {
        // Extract version from the script
        const prefix = address.substring(0, 2).toLowerCase();
        const scriptData = decodeHex(script);
        const version = scriptData[0] % 32;

        // First 2 bytes of the script are version and the script length,
        // respectively, so they are skipped with `.subarray(2)`.
        expect(encodeAddress(prefix, version, scriptData.subarray(2)))
          .to.equal(address.toLowerCase());
      });
    });

    it('should preserve uppercase prefix', () => {
      const data = new Uint8Array(20);
      const encoded = bech32.encode('T3ST', data);
      expect(encoded).to.match(/^T3ST1[A-Z\d]+$/);

      const { prefix, data: restored } = bech32.decode(encoded);
      expect(prefix).to.equal('t3st');
      expect(restored).to.equalBytes(data);
    });

    it('should fail on mixed-case prefix', () => {
      expect(() => bech32.encode('Test', new Uint8Array(20)))
        .to.throw(/Mixed-case prefix/);
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

    it('should disallow unknown encodings', () => {
      expect(() => bech32.encode('test', new Uint8Array(8), 'bogus'))
        .to.throw(/invalid encoding/i);
    });
  });

  describe('decode', () => {
    vectors.validChecksums.forEach(({ encoded, hrp }) => {
      it(`should decode message with valid checksum "${encoded}"`, () => {
        const decoded = bech32.decode(encoded);
        expect(decoded).to.have.property('prefix', hrp);
        expect(decoded).to.have.property('encoding', 'bech32');
      });
    });

    vectors.validBech32mChecksums.forEach(({ encoded, hrp }) => {
      it(`should decode bech32m message with valid checksum "${encoded}"`, () => {
        const decoded = bech32.decode(encoded);
        expect(decoded).to.have.property('prefix', hrp);
        expect(decoded).to.have.property('encoding', 'bech32m');
      });
    });

    vectors.validAddresses.forEach(({ address, script }) => {
      it(`should decode address "${address}" from test vectors`, () => {
        const decoded = bech32.decodeTo5BitArray(address);
        expect(decoded.prefix).to.satisfy((hrp) => hrp === 'bc' || hrp === 'tb');
        expect(decoded.encoding).to.equal('bech32');

        // Need to remove script version separately, hence `.subarray`
        const decScript = bech32.from5BitArray(decoded.data.subarray(1));

        expect(decScript).to.equalBytes(script.substring(4));
      });
    });

    vectors.validAddresses.forEach(({ bech32mAddress: address, script }) => {
      if (address !== undefined) {
        it(`should decode bech32m address "${address}" from test vectors`, () => {
          const decoded = bech32.decodeTo5BitArray(address);
          expect(decoded.prefix).to.satisfy((hrp) => hrp === 'bc' || hrp === 'tb');
          expect(decoded.encoding).to.equal('bech32m');

          // Need to remove script version separately, hence `.subarray`
          const decScript = bech32.from5BitArray(decoded.data.subarray(1));

          expect(decScript).to.equalBytes(script.substring(4));
        });
      }
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
      vectors.validAddresses.forEach(({ address, bech32mAddress, script }) => {
        const actualAddress = bech32mAddress ?? address;

        it(`should decode address "${actualAddress}" from test vectors`, () => {
          const decoded = BitcoinAddress.decode(actualAddress);
          const scriptData = decodeHex(script);
          const version = scriptData[0] % 32;

          expect(decoded.prefix).to.satisfy((prefix) => prefix === 'tb' || prefix === 'bc');
          expect(decoded.scriptVersion).to.equal(version);
          expect(decoded.data).to.equalBytes(scriptData.subarray(2));
          expect(decoded.encode()).to.equal(actualAddress.toLowerCase());
        });

        if (bech32mAddress != null) {
          it(`should not decode outdated address "${address}" from test vectors`, () => {
            expect(() => BitcoinAddress.decode(address))
              .to.throw(/unexpected encoding/i);
          });
        }
      });

      it('should fail to decode address with invalid prefix', () => {
        expect(() => BitcoinAddress.decode('abcdef1qpzry9x8gf2tvdw0s3jn54khce6mua7lmqqqxw')).to.throw(/prefix/i);
      });

      it('should fail to decode bech32m address for v0 script', () => {
        const address = 'tb1q0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vq24jc47';
        expect(() => BitcoinAddress.decode(address)).to.throw(/unexpected encoding/i);
      });
    });

    describe('type', () => {
      vectors.validAddresses.forEach(({ address, bech32mAddress, type }) => {
        const actualAddress = bech32mAddress ?? address;

        it(`should guess the type of address "${actualAddress}" (${type})`, () => {
          const decoded = BitcoinAddress.decode(actualAddress);
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
