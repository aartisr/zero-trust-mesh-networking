/**
 * Defense Standards Implementation
 * - NATO STANAG 4586: Standard Architecture for UAV Control Systems (C2 & Inertial Telemetry)
 * - CCSDS 734.2-B-1 / RFC 9171: Delay-Tolerant Networking Bundle Protocol Version 7
 */

import { Stanag4586Frame, DtnBundle } from '../types/protocol';

/**
 * Encode STANAG 4586 frame into raw simulated byte string and hex representation
 */
export function encodeStanag4586(
  vehicleId: number,
  msgId: number,
  telemetry: {
    lat: number;
    lon: number;
    alt: number;
    heading: number;
    speed: number;
    status: 'NOMINAL' | 'PAYLOAD_ACTIVE' | 'EMERGENCY_RTH';
  }
): { frame: Stanag4586Frame; rawHex: string } {
  const frame: Stanag4586Frame = {
    header: {
      syncBytes: '55AA',
      messageId: msgId,
      messageLength: 48,
      sourceVehicleId: vehicleId,
      destinationVehicleId: 100, // Ground Control Station ID
      timestampUtc: new Date().toISOString(),
      classificationLevel: 'NATO SECRET',
    },
    telemetryPayload: {
      latitude: telemetry.lat,
      longitude: telemetry.lon,
      altitudeM: telemetry.alt,
      headingDeg: telemetry.heading,
      groundSpeedKts: telemetry.speed,
      airframeStatus: telemetry.status,
      sensorPayload: 'EO-IR_OPTICAL_GIMBAL_STABILIZED',
    },
    checksumHex: '7E4B',
  };

  // Build raw hex representation
  const syncHex = '55AA';
  const msgIdHex = msgId.toString(16).padStart(4, '0').toUpperCase();
  const lenHex = '0030';
  const srcHex = vehicleId.toString(16).padStart(4, '0').toUpperCase();
  const dstHex = '0064';
  const latHex = Math.floor(telemetry.lat * 10000).toString(16).padStart(8, '0').toUpperCase();
  const lonHex = Math.floor(telemetry.lon * 10000).toString(16).padStart(8, '0').toUpperCase();
  const altHex = Math.floor(telemetry.alt).toString(16).padStart(4, '0').toUpperCase();
  const hdgHex = Math.floor(telemetry.heading).toString(16).padStart(4, '0').toUpperCase();
  const spdHex = Math.floor(telemetry.speed).toString(16).padStart(4, '0').toUpperCase();
  const crcHex = '7E4B';

  const rawHex = `${syncHex}${msgIdHex}${lenHex}${srcHex}${dstHex}${latHex}${lonHex}${altHex}${hdgHex}${spdHex}${crcHex}`;

  return { frame, rawHex };
}

/**
 * Encode CCSDS RFC 9171 Bundle Protocol Primary Block
 */
export function encodeCcsdsBundle(bundle: DtnBundle): {
  fields: { name: string; value: string; byteOffset: number; byteLength: number }[];
  rawHex: string;
} {
  const fields = [
    { name: 'Version (RFC 9171)', value: '0x07 (BPv7)', byteOffset: 0, byteLength: 1 },
    { name: 'Processing Control Flags', value: '0x00000021 (Custody Req | Urgent)', byteOffset: 1, byteLength: 4 },
    { name: 'CRC Type', value: '0x02 (Standard CRC-32C)', byteOffset: 5, byteLength: 1 },
    { name: 'Destination EID', value: bundle.destinationEid, byteOffset: 6, byteLength: 16 },
    { name: 'Source Node EID', value: bundle.sourceEid, byteOffset: 22, byteLength: 16 },
    { name: 'Report-To EID', value: bundle.custodianEid, byteOffset: 38, byteLength: 16 },
    { name: 'Creation Timestamp', value: `${bundle.creationTimestamp} ms`, byteOffset: 54, byteLength: 8 },
    { name: 'Lifetime (Seconds)', value: `${bundle.lifetimeSeconds}s TTL`, byteOffset: 62, byteLength: 4 },
    { name: 'Hop Count / Custody ID', value: `0x03 / ${bundle.bundleId.slice(0, 8)}`, byteOffset: 66, byteLength: 6 },
    { name: 'Payload Block Bytes', value: `${bundle.payloadBytes} Bytes [${bundle.payloadType}]`, byteOffset: 72, byteLength: bundle.payloadBytes },
  ];

  // Synthesize hex dump
  const vHex = '07';
  const flagsHex = '00000021';
  const crcTypeHex = '02';
  const timeHex = Math.floor(bundle.creationTimestamp / 1000).toString(16).padStart(8, '0').toUpperCase();
  const ttlHex = bundle.lifetimeSeconds.toString(16).padStart(4, '0').toUpperCase();
  const payloadHex = 'CAFE00BABE0102030405060708090A0B0C0D0E0F';

  const rawHex = `${vHex}${flagsHex}${crcTypeHex}${timeHex}${ttlHex}${payloadHex}`;

  return { fields, rawHex };
}

/**
 * Format raw hex into standard Wireshark/Hex-dump offset view
 */
export function formatHexDump(hexString: string): string[] {
  const clean = hexString.replace(/\s+/g, '');
  const lines: string[] = [];
  const chunkSize = 32; // 16 bytes per line = 32 hex chars

  for (let i = 0; i < clean.length; i += chunkSize) {
    const chunk = clean.slice(i, i + chunkSize);
    const offset = i / 2;
    const offsetHex = offset.toString(16).padStart(4, '0').toUpperCase();
    
    // Group into 2-char bytes
    const bytes = chunk.match(/.{1,2}/g) || [];
    const hexPart = bytes.join(' ').padEnd(48, ' ');
    
    // ASCII representation
    const asciiPart = bytes
      .map(b => {
        const charCode = parseInt(b, 16);
        return charCode >= 32 && charCode <= 126 ? String.fromCharCode(charCode) : '.';
      })
      .join('');

    lines.push(`0x${offsetHex}  ${hexPart}  |${asciiPart}|`);
  }

  return lines;
}
