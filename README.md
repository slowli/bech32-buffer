# Bech32(m) Encoding for Arbitrary Buffers

[![Build status][workflow-image]][workflow-url]
[![Code coverage][coveralls-image]][coveralls-url]
[![Demo][demo-image]][demo-url]

[workflow-image]: https://github.com/slowli/bech32-buffer/workflows/Node.js%20CI/badge.svg?branch=master
[workflow-url]: https://github.com/slowli/bech32-buffer/actions
[coveralls-image]: https://img.shields.io/coveralls/slowli/bech32-buffer.svg
[coveralls-url]: https://coveralls.io/github/slowli/bech32-buffer
[demo-image]: https://img.shields.io/badge/demo-live-blue.svg
[demo-url]: https://slowli.github.io/bech32-buffer/

**Bech32** is a Bitcoin address format specified in [BIP 173][bip-173] and [BIP 350][bip-350].
Among its advantages are: better adaptability to QR codes and in voice conversations,
and improved error detection. This library generalizes Bech32 and its modified version
(Bech32m) to encode any reasonably short byte buffers.

## Usage

### Encoding data

```typescript
declare function encode(
  prefix: string,
  data: Uint8Array,
  encoding: 'bech32' | 'bech32m' = 'bech32'
): string;
```

Encodes binary `data` with the specified human-readable `prefix` into a Bech32(m) string.
The case is preserved: if the prefix is uppercase, then the output will be uppercase
as well; otherwise, the output will be lowercase (including the case when the prefix does
not contain any letters).

#### Arguments

- **prefix:** string  
  Human-readable prefix to hint what kind of data Bech32 encodes. Must contain
  ASCII chars in the range 33-126
- **data:** Uint8Array  
  Binary data to encode
- **encoding:** `bech32` or `bech32m`  
  Specifies whether to use the original Bech32 encoding from [BIP 173][bip-173]
  or the modified encoding from [BIP 350][bip-350]; they differ
  in how a checksum is computed. If omitted, the original encoding is used.

#### Return value

String containing:

1. `prefix`
2. `'1'` separator char
3. `data` encoded with the variant of base32 encoding used by Bech32, and
4. 6-char checksum calculated based on `prefix` and `data`

#### Example

```javascript
const bech32 = require('bech32-buffer');
const data = new Uint8Array(20);
bech32.encode('test', data);
// 'test1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqql6aptf'
```

### Decoding data

```typescript
declare function decode(message: string): {
  prefix: string,
  encoding: 'bech32' | 'bech32m',
  data: Uint8Array
};
```

Extracts human-readable prefix and binary data from the Bech32-encoded string.

#### Arguments

- **data:** string  
  String to decode

#### Return value

An object with the following fields:

- **prefix:** string  
  Human-readable prefix
- **encoding:** `bech32` or `bech32m`  
  Encoding variant inferred from the checksum.
- **data:** Uint8Array  
  Binary data encoded into the input string

Decoding may fail for a variety of reasons (e.g., invalid checksum, or invalid
chars in the input). In this case, `decode()` throws an exception
with a descriptive message.

#### Example

```javascript
const bech32 = require('bech32-buffer');
const data = 'lost1qsyq7yqh9gk0szs5';
bech32.decode(data);
// {
//   prefix: 'lost',
//   encoding: 'bech32',
//   data: Uint8Array([ 4, 8, 15, 16, 23, 42 ])
// }
```

### Bitcoin addresses

```typescript
declare class BitcoinAddress {
  prefix: 'bc' | 'tb';
  scriptVersion: number;
  data: Uint8Array;

  static decode(message: string): BitcoinAddress;
  constructor(prefix: 'bc' | 'tb', scriptVersion: number, data: Uint8Array);
  encode(): string;
  type(): void | 'p2wsh' | 'p2wpkh';
}
```

Provides basic functionality to work with Bech32 encoding of Bitcoin addresses.
Addresses can be `decode`d from strings and `encode`d into strings.
It is also possible to check the `type` of an address. P2WSH and P2WPKH address
types are defined per [BIP 141]. Encoding constraints are defined per [BIP 173][bip-173]
and [BIP 350][bip-350].

#### Example

```javascript
const { BitcoinAddress } = require('bech32-buffer');
const address = BitcoinAddress.decode('BC1QW508D6QEJXTDG4Y5R3ZARVARY0C5XW7KV8F3T4');
// address.prefix === 'bc'
// address.scriptVersion === 0
// address.data.length === 20
// address.type() === 'p2wpkh'
```

## Use in Browsers

Use `dist/bech32-buffer.min.js` from the package distribution
or your favorite browserifier. In the first case,
the library will be available as a `bech32` global variable:

```html
<script src="bech32-buffer.min.js"></script>
<!-- later -->
<script>
bech32.encode('test', new Uint8Array(20));
</script>
```

Check out [the web demo](https://slowli.github.io/bech32-buffer/) to see how
**bech32-buffer** works in browser. It is also available in the `examples`
directory of the package.

## Acknowledgements

[BIP 173][bip-173] is authored by Pieter Wuille and Greg Maxwell and is licensed
under the 2-clause BSD license.
[BIP 350][bip-350] is authored by Pieter Wuille and is licensed
under the 2-clause BSD license.

There are at least 2 existing implementations of Bech32 for JavaScript:

- [The reference implementation][ref] by Pieter Wuille
- [Another implementation][bech32] available as the [`bech32` package][bech32-pkg]

Both implementations are Bitcoin-specific, and the reference implementation
is also not in the Npm / yarn package manager.

## License

**bech32-buffer** is available under [Apache-2.0 license](LICENSE).

[bip-173]: https://github.com/bitcoin/bips/blob/master/bip-0173.mediawiki
[bip-350]: https://github.com/bitcoin/bips/blob/master/bip-0350.mediawiki
[ref]: https://github.com/sipa/bech32/tree/master/ref/javascript
[bech32]: https://github.com/bitcoinjs/bech32
[bech32-pkg]: https://www.npmjs.com/package/bech32
[BIP 141]: https://github.com/bitcoin/bips/blob/master/bip-0141.mediawiki
