/**
 * bleDecoder.ts
 * Port TypeScript of backend/bluetooth/decoder.py
 *
 * Decodes raw 20-byte BLE packets from the FEMMTO BCS15 scale.
 * Protocol summary:
 *   Byte 2 (B2): 0x00 = measuring, 0x80 = stable/locked, 0x01 = final composition packet
 *   Weight (grams) = ((B3 & 0x01) << 16) | (B4 << 8) | B5  → divide by 1000 for kg
 *   Impedance (Ω)  = (B6 << 8) | B7  (only present in the final packet, B2=0x01)
 */

export type PacketState = 'measuring' | 'stable' | 'final' | 'unknown' | 'invalid';

export interface DecodedPacket {
  valid: boolean;
  state: PacketState;
  weightKg: number;
  impedanceOhms: number;   // 0 unless state === 'final'
  rawBytes: number[];
  error?: string;
}

/**
 * Decode a raw DataView (from characteristicvaluechanged) or a number[] into
 * a structured DecodedPacket.
 */
export function decodePacket(raw: DataView | number[]): DecodedPacket {
  // Normalise to number[]
  const bytes: number[] =
    raw instanceof DataView
      ? Array.from({ length: raw.byteLength }, (_, i) => raw.getUint8(i))
      : raw;

  if (bytes.length !== 20) {
    return {
      valid: false,
      state: 'invalid',
      weightKg: 0,
      impedanceOhms: 0,
      rawBytes: bytes,
      error: `Expected 20 bytes, received ${bytes.length}`,
    };
  }

  const b2 = bytes[2];
  const b3 = bytes[3];
  const b4 = bytes[4];
  const b5 = bytes[5];

  // --- State ---
  let state: PacketState = 'unknown';
  if (b2 === 0x00) state = 'measuring';
  else if (b2 === 0x80) state = 'stable';
  else if (b2 === 0x01) state = 'final';

  // --- Weight (bit-17 trick from decoder.py) ---
  const weightGrams = ((b3 & 0x01) << 16) | (b4 << 8) | b5;
  const weightKg = weightGrams / 1000;

  // --- Impedance (only in final packet, bytes 6-7) ---
  const impedanceOhms = state === 'final' ? (bytes[6] << 8) | bytes[7] : 0;

  return { valid: true, state, weightKg, impedanceOhms, rawBytes: bytes };
}
