/**
 * Cryptographic operations for Tactical Zero-Trust Mesh
 * Noise Protocol (XX Handshake), ChaCha20-Poly1305 AEAD framing,
 * and 64-bit sliding window anti-replay protection (RFC 6479).
 */

import { ReplayWindow } from '../types/protocol';

/**
 * Generate a deterministic or randomized hex fingerprint
 */
export function generateKeyHex(lengthBytes = 32): string {
  const bytes = new Uint8Array(lengthBytes);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < lengthBytes; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Format public key as tactical base16 fingerprint
 */
export function formatFingerprint(keyHex: string): string {
  const clean = keyHex.replace(/[^0-9a-fA-F]/g, '');
  return `${clean.slice(0, 4)}:${clean.slice(4, 8)}:${clean.slice(8, 12)}:${clean.slice(12, 16)}`;
}

/**
 * Noise Protocol XX Handshake Message Generator
 * Handshake Pattern XX:
 *   -> e
 *   <- e, ee, s, es
 *   -> s, se
 */
export interface NoiseHandshakeState {
  pattern: 'Noise_XX_25519_ChaChaPoly_BLAKE2s';
  initiatorStaticPub: string;
  responderStaticPub: string;
  initiatorEphemeralPub: string;
  responderEphemeralPub: string;
  derivedSharedSecret: string;
  status: 'ESTABLISHED' | 'IN_PROGRESS' | 'REJECTED';
}

export function performNoiseXXHandshake(
  initiatorStatic: string,
  responderStatic: string
): NoiseHandshakeState {
  const e1 = generateKeyHex(32);
  const e2 = generateKeyHex(32);
  
  // Calculate simulated ECDH shared secret mixing (ee, es, se)
  const combined = `${initiatorStatic.slice(0, 16)}${responderStatic.slice(0, 16)}${e1.slice(0, 16)}${e2.slice(0, 16)}`;
  let hashVal = 0;
  for (let i = 0; i < combined.length; i++) {
    hashVal = (hashVal << 5) - hashVal + combined.charCodeAt(i);
    hashVal |= 0;
  }
  
  const derivedSharedSecret = `0x${Math.abs(hashVal).toString(16).padStart(8, '0')}${generateKeyHex(28)}`;

  return {
    pattern: 'Noise_XX_25519_ChaChaPoly_BLAKE2s',
    initiatorStaticPub: initiatorStatic,
    responderStaticPub: responderStatic,
    initiatorEphemeralPub: e1,
    responderEphemeralPub: e2,
    derivedSharedSecret,
    status: 'ESTABLISHED',
  };
}

/**
 * ChaCha20-Poly1305 Encrypted Packet Framing
 * Header (Plaintext): [Version(1B) | Type(1B) | SeqNo(4B) | SourceID(4B) | TargetID(4B) | Nonce(12B)]
 * Ciphertext: [Encrypted Payload]
 * Auth Tag: [Poly1305 MAC 16B]
 */
export function sealChaCha20Poly1305(
  payloadPlainText: string,
  keyHex: string,
  sequenceNumber: number
): { ciphertextHex: string; macTagHex: string; nonceHex: string } {
  const nonceHex = generateKeyHex(12);
  
  // Simple deterministic XOR stream cipher simulation with Poly1305 MAC tag
  const encoder = new TextEncoder();
  const bytes = encoder.encode(payloadPlainText);
  const cipherBytes: number[] = [];
  const keyBytes = keyHex.match(/.{1,2}/g)?.map(b => parseInt(b, 16)) || [0xaa, 0xbb];
  
  for (let i = 0; i < bytes.length; i++) {
    const k = keyBytes[i % keyBytes.length] ^ (sequenceNumber & 0xff);
    cipherBytes.push(bytes[i] ^ k);
  }
  
  const ciphertextHex = cipherBytes.map(b => b.toString(16).padStart(2, '0')).join('');
  // Generate 16-byte authentication tag
  const macTagHex = generateKeyHex(16);

  return { ciphertextHex, macTagHex, nonceHex };
}

/**
 * 64-Bit Anti-Replay Sliding Window Algorithm (RFC 6479 / RFC 4303)
 * Protects against replay attacks in ad-hoc mesh networks where packets may arrive out of order.
 */
export function initReplayWindow(size = 64): ReplayWindow {
  return {
    lastSequenceNumber: 0,
    windowBitmap: 0,
    windowSize: size,
  };
}

export interface AntiReplayCheckResult {
  accepted: boolean;
  reason: 'VALID_NEW_MAX' | 'VALID_IN_WINDOW' | 'DROPPED_REPLAY_DUPLICATE' | 'DROPPED_TOO_OLD_OUTSIDE_WINDOW';
  updatedWindow: ReplayWindow;
}

export function checkAndAdvanceReplayWindow(
  window: ReplayWindow,
  seqNo: number
): AntiReplayCheckResult {
  const { lastSequenceNumber, windowBitmap, windowSize } = window;
  
  // First packet or packet with strictly higher sequence number
  if (seqNo > lastSequenceNumber) {
    const diff = seqNo - lastSequenceNumber;
    let newBitmap = windowBitmap;
    if (diff < windowSize) {
      newBitmap = (newBitmap << diff) | 1;
    } else {
      // Jumped beyond window size
      newBitmap = 1;
    }
    
    return {
      accepted: true,
      reason: 'VALID_NEW_MAX',
      updatedWindow: {
        lastSequenceNumber: seqNo,
        windowBitmap: newBitmap,
        windowSize,
      },
    };
  }

  // Sequence number is older than highest seen
  const diff = lastSequenceNumber - seqNo;
  if (diff >= windowSize) {
    // Packet is too old; falls behind the left edge of the sliding window
    return {
      accepted: false,
      reason: 'DROPPED_TOO_OLD_OUTSIDE_WINDOW',
      updatedWindow: window,
    };
  }

  // Check if bit at position 'diff' is already set
  const mask = 1 << diff;
  if ((windowBitmap & mask) !== 0) {
    // Packet has already been seen: REPLAY ATTACK!
    return {
      accepted: false,
      reason: 'DROPPED_REPLAY_DUPLICATE',
      updatedWindow: window,
    };
  }

  // Packet is out of order but inside window and not seen before -> accept and mark bit
  return {
    accepted: true,
    reason: 'VALID_IN_WINDOW',
    updatedWindow: {
      lastSequenceNumber,
      windowBitmap: windowBitmap | mask,
      windowSize,
    },
  };
}
