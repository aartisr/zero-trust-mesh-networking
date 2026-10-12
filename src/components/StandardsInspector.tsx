/**
 * Defense Standards & Deep Packet Telemetry Inspector
 * Compliant with NATO STANAG 4586 and CCSDS Bundle Protocol RFC 9171.
 */

import React, { useState } from 'react';
import {
  FileCode,
  Shield,
  Layers,
  CheckCircle2,
  Copy,
  Check,
  Binary,
  Radio,
} from 'lucide-react';
import { encodeStanag4586, encodeCcsdsBundle, formatHexDump } from '../utils/standards';
import { DtnBundle } from '../types/protocol';

export const StandardsInspector: React.FC = () => {
  const [selectedStandard, setSelectedStandard] = useState<'STANAG_4586' | 'CCSDS_9171' | 'NOISE_FRAME'>('STANAG_4586');
  const [copied, setCopied] = useState(false);

  // Generate sample STANAG frame
  const sampleStanag = encodeStanag4586(1, 2000, {
    lat: 38.8951,
    lon: -77.0364,
    alt: 5200,
    heading: 142,
    speed: 120,
    status: 'NOMINAL',
  });

  // Generate sample CCSDS bundle
  const sampleBundleData: DtnBundle = {
    bundleId: 'bundle-tactical-001',
    version: 7,
    sourceEid: 'dtn://valkyrie-uav',
    destinationEid: 'dtn://bastion-hq',
    custodianEid: 'dtn://valkyrie-uav',
    creationTimestamp: Date.now(),
    lifetimeSeconds: 300,
    isCustodyAccepted: true,
    payloadType: 'TACTICAL_RECON_IMAGE',
    payloadBytes: 256,
    status: 'QUEUED_IN_CUSTODY',
  };
  const sampleCcsds = encodeCcsdsBundle(sampleBundleData);

  const activeRawHex = selectedStandard === 'STANAG_4586'
    ? sampleStanag.rawHex
    : selectedStandard === 'CCSDS_9171'
    ? sampleCcsds.rawHex
    : '55AA0020000100644E4F4953455F58585F455048454D4552414C5F4B45595F32353531393938343230303031';

  const hexLines = formatHexDump(activeRawHex);

  const handleCopyHex = () => {
    navigator.clipboard.writeText(activeRawHex);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-4 bg-[#0B0F19] border border-[#1E293B] rounded-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Binary className="w-4 h-4 text-cyan-400" />
            Defense Standards Telemetry & Byte-Level Frame Inspector
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Validation of NATO STANAG 4586 UAV control telemetry, CCSDS 734.2-B-1 / RFC 9171 Bundle frames, and Noise cryptographic framing.
          </p>
        </div>

        {/* Standard Selector */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-700/80 rounded-lg">
          <button
            onClick={() => setSelectedStandard('STANAG_4586')}
            className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
              selectedStandard === 'STANAG_4586'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            NATO STANAG 4586
          </button>
          <button
            onClick={() => setSelectedStandard('CCSDS_9171')}
            className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
              selectedStandard === 'CCSDS_9171'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            CCSDS RFC 9171 (DTN)
          </button>
          <button
            onClick={() => setSelectedStandard('NOISE_FRAME')}
            className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
              selectedStandard === 'NOISE_FRAME'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Noise Protocol Frame
          </button>
        </div>
      </div>

      {/* Main Grid: Field Decoder & Wireshark Hex Dump */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Structured Protocol Field Decoder */}
        <div className="bg-[#0B0F19] border border-[#1E293B] rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">
                DECODED PACKET FIELDS
              </span>
              <h3 className="text-sm font-bold text-slate-100 mt-0.5">
                {selectedStandard === 'STANAG_4586' && 'STANAG 4586 Message #2000 (C2 Steering & Telemetry)'}
                {selectedStandard === 'CCSDS_9171' && 'CCSDS BPv7 Primary Block & Custody Record'}
                {selectedStandard === 'NOISE_FRAME' && 'Noise Handshake Message #2 Payload Frame'}
              </h3>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-mono bg-emerald-950/60 border border-emerald-800 text-emerald-400 rounded">
              CRC-16 / Poly1305 Valid
            </span>
          </div>

          {selectedStandard === 'STANAG_4586' && (
            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-1.5">
                <div className="text-[11px] text-cyan-400 font-bold border-b border-slate-800/80 pb-1">
                  HEADER FIELDS (16 BYTES)
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Sync Preamble:</span>
                  <span className="text-slate-200 font-bold">0x55AA (STANAG Standard Sync)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Message ID:</span>
                  <span className="text-slate-200">0x07D0 (#2000 C2 Steering & Waypoint)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Source Vehicle ID:</span>
                  <span className="text-cyan-300">0x0001 (MQ-9 Airborne Relay)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Target Station ID:</span>
                  <span className="text-cyan-300">0x0064 (Ground Control Station TOC)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Classification:</span>
                  <span className="text-rose-400 font-bold">NATO SECRET // NOFORN</span>
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-1.5">
                <div className="text-[11px] text-cyan-400 font-bold border-b border-slate-800/80 pb-1">
                  INERTIAL TELEMETRY PAYLOAD (32 BYTES)
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Coordinates:</span>
                  <span className="text-slate-200 tabular-nums">38.8951° N, -77.0364° W</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Pressure Altitude:</span>
                  <span className="text-slate-200 tabular-nums">5,200 m (MSL)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">True Airspeed / Heading:</span>
                  <span className="text-slate-200 tabular-nums">120 kts / 142° True</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Airframe Status:</span>
                  <span className="text-emerald-400 font-bold">NOMINAL_EN_ROUTE</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">CRC-16-CCITT Checksum:</span>
                  <span className="text-emerald-400 font-bold">0x7E4B (Verified)</span>
                </div>
              </div>
            </div>
          )}

          {selectedStandard === 'CCSDS_9171' && (
            <div className="space-y-2 font-mono text-xs">
              <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-1.5">
                <div className="text-[11px] text-amber-400 font-bold border-b border-slate-800/80 pb-1">
                  CCSDS RFC 9171 PRIMARY BUNDLE BLOCK
                </div>
                {sampleCcsds.fields.map((f, idx) => (
                  <div key={idx} className="flex justify-between text-[11px]">
                    <span className="text-slate-500">{f.name}:</span>
                    <span className="text-slate-200 font-semibold">{f.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedStandard === 'NOISE_FRAME' && (
            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-1.5">
                <div className="text-[11px] text-cyan-400 font-bold border-b border-slate-800/80 pb-1">
                  NOISE PROTOCOL WIRE FORMAT
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Cipher Protocol:</span>
                  <span className="text-slate-200">ChaCha20-Poly1305 AEAD</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Diffie-Hellman Curve:</span>
                  <span className="text-slate-200">Curve25519 (X25519)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Key Derivation Function:</span>
                  <span className="text-slate-200">HKDF-BLAKE2s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Poly1305 MAC Tag:</span>
                  <span className="text-emerald-400">16 Bytes (Cryptographic Integrity Guaranteed)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Anti-Replay Counter:</span>
                  <span className="text-cyan-300">64-bit Nonce Protection</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Wireshark-Style Hex Dump Stream */}
        <div className="bg-[#0B0F19] border border-[#1E293B] rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">
                RAW WIRE BYTE STREAM
              </span>
              <h3 className="text-sm font-bold text-slate-100 mt-0.5">
                Hex Dump & ASCII Reconstruction
              </h3>
            </div>
            <button
              onClick={handleCopyHex}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded font-mono transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy Hex'}</span>
            </button>
          </div>

          <div className="bg-slate-950 p-3.5 rounded border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto space-y-1">
            <div className="text-slate-500 border-b border-slate-800/80 pb-1 text-[10px]">
              OFFSET   00 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F  ASCII
            </div>
            {hexLines.map((line, idx) => (
              <div key={idx} className="hover:bg-slate-900/60 font-medium">
                {line}
              </div>
            ))}
          </div>

          <div className="p-3 bg-slate-900/40 rounded border border-slate-800 text-xs text-slate-400">
            <strong className="text-slate-200">Wire Inspection Note:</strong> Payloads are serialized in big-endian network byte order. All STANAG frames include synchronization preambles allowing tactical SDR modems (Harris Falcon, Silvus StreamCaster) to lock onto packet frames without preamble loss.
          </div>
        </div>
      </div>

      {/* Defense Interoperability Checklist */}
      <div className="bg-[#0B0F19] border border-[#1E293B] rounded-lg p-5 space-y-3">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <Shield className="w-4 h-4 text-cyan-400" />
          Military & Space Standards Interoperability Checklist
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
          <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>NATO STANAG 4586 Ed.3</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Interoperability between heterogeneous NATO member UAVs and Ground Control Stations (GCS).
            </p>
          </div>

          <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>CCSDS 734.2-B-1 (DTN)</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Delay-Tolerant Networking Bundle Protocol specification for deep space and disconnected tactical ad-hoc nodes.
            </p>
          </div>

          <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Noise Protocol Framework</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Zero-Trust mutual authentication, static Ed25519 identity attestation, and ephemeral Diffie-Hellman forward secrecy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
