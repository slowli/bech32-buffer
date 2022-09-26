/**
 * Virtual type for an array in which each element represents 5 bits.
 */
export declare type FiveBitArray = Uint8Array;
// As TypeScript (unlike Flow) always uses structural typing for determining type compatibility,
// there seems to be no way to express this better.

/**
 * Encoding from the Bech32 family used during encoding / decoding.
 */
export declare type Encoding = 'bech32' | 'bech32m';

/**
 * Converts a Uint8Array into a Uint8Array variant, in which each element
 * encodes 5 bits of the original byte array.
 *
 * @param src
 *   Input to convert
 * @param dst
 *   Optional output buffer. If specified, the sequence of 5-bit chunks will be written there;
 *   if not specified, the output buffer will be created from scratch. The length
 *   of `outBuffer` is not checked.
 * @returns
 *   Output buffer consisting of 5-bit chunks
 */
export declare function to5BitArray(src: Uint8Array, dst?: FiveBitArray): FiveBitArray;

/**
 * Converts a sequence of 5-bit chunks into an ordinary Uint8Array.
 *
 * @param src
 *   Input to convert
 * @param dst
 *   Optional output buffer. If specified, the converted bytes will be written there;
 *   if not specified, the output buffer will be created from scratch. The length
 *   of `outBuffer` is not checked.
 * @returns
 *   Output buffer
 */
export declare function from5BitArray(src: FiveBitArray, dst?: Uint8Array): Uint8Array;

/**
 * Encodes binary data into Bech32 encoding.
 *
 * The case is preserved: if the prefix is uppercase, then the output will be uppercase
 * as well; otherwise, the output will be lowercase (including the case when the prefix does
 * not contain any letters).
 *
 * Ordinarily, you may want to use `encode` because it converts
 * binary data to an array of 5-bit integers automatically.
 *
 * @param prefix
 *   Human-readable prefix to place at the beginning of the encoding
 * @param data
 *   Array of 5-bit integers with data to encode
 * @param encoding
 *   Encoding to use; influences the checksum computation. If not specified,
 *   Bech32 encoding will be used.
 * @returns
 *   Bech32(m) encoding of data in the form `<prefix>1<base32 of data><checksum>`
 * @throws If the prefix is mixed-case or contains chars that are not eligible for Bech32 encoding
 */
export declare function encode5BitArray(
  prefix: string,
  data: FiveBitArray,
  encoding?: Encoding
): string;

/**
 * Result of a decoding operation.
 */
export interface DecodeResult<T = Uint8Array> {
  /** Human-readable prefix. */
  prefix: string;
  /** Variation of the Bech32 encoding inferred from the checksum. */
  encoding: Encoding;
  /** Decoded data. */
  data: T;
}

/**
 * Decodes data from Bech32 encoding into an array of 5-bit integers.
 *
 * Ordinarily, you may want to use `decode` because it automatically
 * converts the array of 5-bit integers into an ordinary `Uint8Array`.
 *
 * @param message
 *   Bech32-encoded message
 * @returns
 *   Decoded object with `prefix` and `data` fields, which contain the human-readable
 *   prefix and the array of 5-bit integers respectively.
 */
export declare function decodeTo5BitArray(message: string): DecodeResult<FiveBitArray>;

/**
 * Encodes binary data into Bech32 encoding.
 *
 * The case is preserved: if the prefix is uppercase, then the output will be uppercase
 * as well; otherwise, the output will be lowercase (including the case when the prefix does
 * not contain any letters).
 *
 * @param prefix
 *   Human-readable prefix to place at the beginning of the encoding
 * @param data
 *   Binary data to encode
 * @param encoding
 *   Encoding to use; influences the checksum computation. If not specified,
 *   Bech32 encoding will be used.
 * @returns
 *   Bech32 encoding of data in the form `<prefix>1<base32 of data><checksum>`
 * @throws If the prefix is mixed-case or contains chars that are not eligible for Bech32 encoding
 */
export declare function encode(
  prefix: string,
  data: Uint8Array,
  encoding?: Encoding
): string;

/**
 * Decodes data from Bech32 encoding into an array of 5-bit integers.
 *
 * @param message
 *   Bech32-encoded message
 * @returns
 *   Decoded object with `prefix` and `data` fields, which contain the human-readable
 *   prefix and the decoded binary data respectively.
 */
export declare function decode(message: string): DecodeResult;

/**
 * Bitcoin address.
 */
export declare class BitcoinAddress {
  /**
   * Human-readable prefix. Equals `'bc'` (for mainnet addresses)
   * or `'tb'` (for testnet addresses).
   */
  prefix: 'bc' | 'tb';
  /**
   * Script version. An integer between 0 and 16 (inclusive).
   */
  scriptVersion: number;
  /**
   * Script data. A byte string with length 2 to 40 (inclusive).
   */
  data: Uint8Array;

  /**
   * Decodes a Bitcoin address from a Bech32 string.
   * As per BIP 350, the original encoding is expected for version 0 scripts, while
   * other script versions expect the modified encoding.
   *
   * This method does not check whether the address is well-formed;
   * use `type()` method on returned address to find that out.
   */
  static decode(message: string): BitcoinAddress;

  /**
   * Creates a new address based on provided data.
   *
   * Validation is performed on the fields as specified in their description (e.g.,
   * it is checked that `scriptVersion` is between 0 and 16). Additionally,
   * for `scriptVersion == 0` it is checked that `data` is either 20 or 32 bytes long.
   *
   * @throws {Error} If provided fields do not pass validation.
   */
  constructor(prefix: 'bc' | 'tb', scriptVersion: number, data: Uint8Array);

  /**
   * Encodes this address in Bech32 or Bech32m format, depending on the script version.
   * Version 0 scripts are encoded using original Bech32 encoding as per BIP 173,
   * while versions 1-16 are encoded using the modified encoding as per BIP 350.
   */
  encode(): string;

  /**
   * Guesses the address type based on its internal structure.
   */
  type(): void | 'p2wsh' | 'p2wpkh';
}
