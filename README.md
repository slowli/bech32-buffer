# Bech32 Encoding for Arbitrary Buffers

[![Build status][travis-image]][travis-url]
[![Code coverage][coveralls-image]][coveralls-url]
[![Code style][code-style-image]][code-style-url]

[travis-image]: https://img.shields.io/travis/slowli/bech32-buffer.svg?style=flat-square
[travis-url]: https://travis-ci.org/slowli/bech32-buffer
[coveralls-image]: https://img.shields.io/coveralls/slowli/bech32-buffer.svg?style=flat-square
[coveralls-url]: https://coveralls.io/github/slowli/bech32-buffer
[code-style-image]: https://img.shields.io/badge/code%20style-Airbnb-brightgreen.svg?style=flat-square
[code-style-url]: https://github.com/airbnb/javascript

**Bech32** is a new proposed Bitcoin address format specified in [BIP 173][bip-173].
Among its advantages are: better adaptability to QR codes and in voice conversations,
and improved error detection. This library generalizes Bech32 to encode any
(reasonably short) byte buffers.

## Usage

### Encoding Data

```javascript
var bech32 = require('bech32-buffer');
var data = new Uint8Array(20);
var encoded = bech32.encode('test', data);
// 'test1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqql6aptf'
```

### Decoding Data

```javascript
var data = 'lost1qsyq7yqh9gk0szs5';
var decoded = bech32.decode(data);
// {
//   prefix: 'lost',
//   data: Uint8Array([ 4, 8, 15, 16, 23, 42 ])
// }
```

## Acknowledgements

[BIP 173][bip-173] is authored by Pieter Wuille and Greg Maxwell and is licensed
under the 2-clause BSD license.

There are at least 2 existing implementations of Bech32 for JavaScript:

- [The reference implementation][ref] by Pieter Wuille
- [Another implementation][bech32] available as the [`bech32` package][bech32-pkg]

Both implementations are Bitcoin-specific, and the reference implementation
is also not in the Npm / yarn package manager.

## License

(c) 2017 Alex Ostrovski

**bech32-buffer** is available under [Apache-2.0 license](LICENSE).

[bip-173]: https://github.com/bitcoin/bips/blob/master/bip-0173.mediawiki
[ref]: https://github.com/sipa/bech32/tree/master/ref/javascript
[bech32]: https://github.com/bitcoinjs/bech32
[bech32-pkg]: https://www.npmjs.com/package/bech32
