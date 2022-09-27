# Changelog

All notable changes to this project will be documented in this file.
The project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]

## 0.2.1 - 2022-09-27

### Fixed

- Fix encoding with uppercase prefix. Previously, such prefixes led to incorrect
  checksum. With the fix, the prefix case is retained for the encoded string.

## 0.2.0 - 2021-11-21

No substantial changes compared to the 0.2.0-rc.0 release.

## 0.2.0-rc.0 - 2021-11-07

### Added

- Support [Bech32m encoding] for arbitrary data and Bitcoin addresses.
  The new functionality is available on [the demo web page](https://slowli.github.io/bech32-buffer/).

## 0.1.3 - 2021-05-10

### Added

- Document TypeScript typings.

- Update readme to better document main package APIs.

### Internal improvements

- Update dev dependencies.

- Update Bootstrap / JS dependencies for the demo page.

## 0.1.2 - 2018-12-23

### Added

- Add TypeScript typings for the package.

### Internal improvements

- Update dev dependencies.

## 0.1.1 - 2018-12-15

### Added

- Test browser support and add a browser version of the package in the `dist` directory.

- Support Bitcoin addresses via `BitcoinAddress` class.

## 0.1.0 - 2017-07-23

The initial release of `bech32-buffer`.

[Bech32m encoding]: https://github.com/bitcoin/bips/blob/master/bip-0350.mediawiki
