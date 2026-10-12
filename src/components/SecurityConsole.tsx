/**
 * Zero-Trust Cryptographic Console & Attack Simulator
 * Noise Protocol (XX Handshake), ChaCha20-Poly1305 AEAD, and 64-bit Anti-Replay Filter.
 */

import React, { useState } from 'react';
import { TacticalNode } from '../types/protocol';
import {
  Lock,
  Key,
  ShieldAlert,
  ShieldCheck,
  Zap,
  Terminal,
  RefreshCw,
  AlertTriangle,
  Play,
  RotateCcw,
} from 'lucide-react';
import {
  initReplayWindow,
  checkAndAdvanceReplayWindow,
  performNoiseXXHandshake,
  formatFingerprint,
} from '../utils/crypto';

interface SecurityConsoleProps {
  nodes: TacticalNode[];
  onTriggerAttack: (sourceId: string, targetId: string, attackType: 'REPLAY' | 'TAMPER') => void;
}

export const SecurityConsole: React.FC<SecurityConsoleProps> = ({
  nodes,
  onTriggerAttack,
}) => {
  // Test sliding window state
  const [testWindow, setTestWindow] = useState(initReplayWindow(64));
  const [testSeqInput, setTestSeqInput] = useState<number>(1);
  const [testLog, setTestLog] = useState<Array<{ seq: number; result: string; accepted: boolean; timestamp: string }>>([
    { seq: 1, result: 'VALID_NEW_MAX (Window initialized)', accepted: true, timestamp: '12:00:01' },
  ]);

  // Noise Handshake Demo State
  const [selectedInitiator, setSelectedInitiator] = useState<string>(nodes[0]?.id || 'uav-01');
  const [selectedResponder, setSelectedResponder] = useState<string>(nodes[4]?.id || 'fob-command');
  const [handshakeLog, setHandshakeLog] = useState<any | null>(null);

  const initNode = nodes.find(n => n.id === selectedInitiator);
  const respNode = nodes.find(n => n.id === selectedResponder);

  const handleTestPacketSeq = (seq: number) => {
    const res = checkAndAdvanceReplayWindow(testWindow, seq);
    setTestWindow(res.updatedWindow);
    setTestLog(prev => [
      {
        seq,
        result: res.reason,
        accepted: res.accepted,
        timestamp: new Date().toLocaleTimeString(),
      },
      ...prev.slice(0, 7),
    ]);
  };

  const handleRunNoiseHandshake = () => {
    if (!initNode || !respNode) return;
    const hs = performNoiseXXHandshake(
      initNode.staticPublicKeyHex,
      respNode.staticPublicKeyHex
    );
    setHandshakeLog(hs);
  };

  // 64-bit binary bitmap visualizer
  const bitmapBits: boolean[] = [];
  for (let i = 0; i < 64; i++) {
    const mask = 1 << i;
    bitmapBits.push((testWindow.windowBitmap & mask) !== 0);
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-4 bg-[#0B0F19] border border-[#1E293B] rounded-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Lock className="w-4 h-4 text-cyan-400" />
            Zero-Trust Mutual Authentication & Cryptography
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Noise Protocol Framework (XX Handshake Pattern), ChaCha20-Poly1305 AEAD payload integrity, and RFC 6479 64-bit Anti-Replay sliding window.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (nodes.length >= 2) {
                onTriggerAttack(nodes[0].id, nodes[4]?.id || nodes[1].id, 'REPLAY');
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-rose-950/80 hover:bg-rose-900 border border-rose-700/80 text-rose-300 rounded transition-colors"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Inject Replay Attack</span>
          </button>

          <button
            onClick={() => {
              if (nodes.length >= 2) {
                onTriggerAttack(nodes[0].id, nodes[4]?.id || nodes[1].id, 'TAMPER');
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-amber-950/80 hover:bg-amber-900 border border-amber-700/80 text-amber-300 rounded transition-colors"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Inject MITM Tamper</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Noise Protocol Flow & Anti-Replay Filter */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: Noise Protocol XX Handshake State Machine */}
        <div className="bg-[#0B0F19] border border-[#1E293B] rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">
                MUTUAL AUTHENTICATION PIPELINE
              </span>
              <h3 className="text-sm font-bold text-slate-100 mt-0.5">
                Noise Protocol Pattern XX (Curve25519)
              </h3>
            </div>
            <button
              onClick={handleRunNoiseHandshake}
              className="flex items-center gap-1 px-2.5 py-1 text-xs bg-cyan-950 hover:bg-cyan-900 border border-cyan-700/80 text-cyan-300 rounded transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Simulate Handshake</span>
            </button>
          </div>

          {/* Node Selector for Handshake */}
          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <div>
              <label className="text-[10px] text-slate-500 uppercase block mb-1">Initiator (Alice)</label>
              <select
                value={selectedInitiator}
                onChange={(e) => setSelectedInitiator(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs"
              >
                {nodes.map(n => (
                  <option key={n.id} value={n.id}>{n.callsign} ({n.role})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase block mb-1">Responder (Bob)</label>
              <select
                value={selectedResponder}
                onChange={(e) => setSelectedResponder(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs"
              >
                {nodes.map(n => (
                  <option key={n.id} value={n.id}>{n.callsign} ({n.role})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Handshake 3-Message Flowchart */}
          <div className="space-y-2.5 font-mono text-xs">
            {/* Step 1 */}
            <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-cyan-400 font-bold">
                <span>Message 1: ➔ e</span>
                <span className="text-[10px] text-slate-500">INITIATOR ➔ RESPONDER</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Initiator generates ephemeral Curve25519 keypair <code className="text-cyan-300">(e)</code> and transmits public key in the clear.
              </p>
              {handshakeLog && (
                <div className="text-[10px] text-slate-500 truncate">
                  Ephemeral Pub: <span className="text-slate-300">{handshakeLog.initiatorEphemeralPub.slice(0, 24)}...</span>
                </div>
              )}
            </div>

            {/* Step 2 */}
            <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-cyan-400 font-bold">
                <span>Message 2: ⬅ e, ee, s, es</span>
                <span className="text-[10px] text-slate-500">RESPONDER ➔ INITIATOR</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Responder transmits ephemeral key, performs DH <code className="text-cyan-300">(ee)</code>, encrypts static identity key <code className="text-cyan-300">(s)</code>, and performs DH <code className="text-cyan-300">(es)</code>.
              </p>
              {handshakeLog && (
                <div className="text-[10px] text-slate-500 truncate">
                  Derived Ephemeral Secret: <span className="text-emerald-400">{handshakeLog.derivedSharedSecret.slice(0, 24)}...</span>
                </div>
              )}
            </div>

            {/* Step 3 */}
            <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-cyan-400 font-bold">
                <span>Message 3: ➔ s, se</span>
                <span className="text-[10px] text-slate-500">INITIATOR ➔ RESPONDER</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Initiator transmits encrypted static identity key <code className="text-cyan-300">(s)</code> and completes mutual authentication with DH <code className="text-cyan-300">(se)</code>.
              </p>
            </div>
          </div>

          <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-300 font-semibold font-mono">
                Forward Secrecy & Mutual Attestation Established
              </span>
            </div>
            <span className="text-[10px] font-mono text-emerald-500">ChaCha20-Poly1305</span>
          </div>
        </div>

        {/* Section 2: 64-Bit Anti-Replay Sliding Window Interactive Tester */}
        <div className="bg-[#0B0F19] border border-[#1E293B] rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">
                RFC 6479 / RFC 4303 DEFENSE SPEC
              </span>
              <h3 className="text-sm font-bold text-slate-100 mt-0.5">
                64-Bit Anti-Replay Sliding Window Filter
              </h3>
            </div>
            <button
              onClick={() => {
                setTestWindow(initReplayWindow(64));
                setTestLog([]);
              }}
              className="flex items-center gap-1 px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Window</span>
            </button>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            In tactical multi-hop ad-hoc networks, packets legitimately arrive out-of-order due to dynamic multi-path routing. The 64-bit sliding window accepts out-of-order packets while immediately discarding duplicate replayed packets and stale frames outside the window.
          </p>

          {/* Window State Readout */}
          <div className="grid grid-cols-2 gap-3 bg-slate-950 p-3 rounded border border-slate-800 font-mono text-xs">
            <div>
              <div className="text-[10px] text-slate-500 uppercase">Max Seen Sequence</div>
              <div className="text-base font-bold text-cyan-300 tabular-nums">
                #{testWindow.lastSequenceNumber}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase">Window Left Edge</div>
              <div className="text-base font-bold text-slate-300 tabular-nums">
                #{Math.max(0, testWindow.lastSequenceNumber - testWindow.windowSize)}
              </div>
            </div>
          </div>

          {/* Visual 64-Bit Bitmap Grid */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>64-Bit Register Bitmap (Right: Newest / Left: Oldest)</span>
              <span className="text-cyan-400">0x{testWindow.windowBitmap.toString(16).toUpperCase()}</span>
            </div>
            <div className="grid grid-cols-16 gap-1 p-2 bg-slate-950 rounded border border-slate-800">
              {bitmapBits.slice(0, 32).map((bit, idx) => (
                <div
                  key={idx}
                  title={`Bit offset -${idx}: ${bit ? 'Packet Seen (1)' : 'Unseen (0)'}`}
                  className={`h-4 rounded-sm flex items-center justify-center text-[8px] font-mono transition-colors ${
                    bit
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'bg-slate-800 text-slate-600'
                  }`}
                >
                  {bit ? '1' : '0'}
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Test Controller */}
          <div className="space-y-2">
            <div className="text-[11px] text-slate-400 font-mono">Test Packet Injection:</div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={testSeqInput}
                onChange={(e) => setTestSeqInput(parseInt(e.target.value) || 0)}
                className="w-24 bg-slate-900 border border-slate-700 text-slate-200 rounded px-2.5 py-1.5 text-xs font-mono"
                placeholder="Seq No"
              />
              <button
                onClick={() => handleTestPacketSeq(testSeqInput)}
                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs rounded transition-colors"
              >
                Send Seq
              </button>

              {/* Quick Preset Attack Buttons */}
              <button
                onClick={() => handleTestPacketSeq(testWindow.lastSequenceNumber + 1)}
                className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded font-mono"
                title="Send valid next sequence"
              >
                +1 (Next)
              </button>
              <button
                onClick={() => handleTestPacketSeq(testWindow.lastSequenceNumber)}
                className="px-2 py-1.5 bg-rose-950/70 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs rounded font-mono"
                title="Inject duplicate sequence to test replay drop"
              >
                Replay Duplicate
              </button>
              <button
                onClick={() => handleTestPacketSeq(Math.max(0, testWindow.lastSequenceNumber - 70))}
                className="px-2 py-1.5 bg-amber-950/70 hover:bg-amber-900 border border-amber-800 text-amber-300 text-xs rounded font-mono"
                title="Inject ancient packet to test window lag drop"
              >
                Ancient (&gt;64)
              </button>
            </div>
          </div>

          {/* Test Decision Log */}
          <div className="space-y-1">
            <div className="text-[10px] text-slate-500 font-mono uppercase">Anti-Replay Decision Log</div>
            <div className="max-h-24 overflow-y-auto space-y-1 font-mono text-[10px]">
              {testLog.map((log, i) => (
                <div
                  key={i}
                  className={`p-1.5 rounded flex items-center justify-between border ${
                    log.accepted
                      ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                      : 'bg-rose-950/20 border-rose-800/40 text-rose-300'
                  }`}
                >
                  <span>
                    Seq #{log.seq}: {log.result}
                  </span>
                  <span className="text-slate-500">{log.timestamp}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Network Ed25519 Identity Keyring Matrix */}
      <div className="bg-[#0B0F19] border border-[#1E293B] rounded-lg p-5 space-y-3">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <Key className="w-4 h-4 text-cyan-400" />
          Tactical Node Public Keyring & Attestation Directory
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {nodes.map(n => (
            <div
              key={n.id}
              className="p-3 bg-slate-950 rounded border border-slate-800 font-mono text-xs space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200">{n.callsign}</span>
                <span className="text-[10px] text-emerald-400 font-sans">
                  ● Verified Ed25519
                </span>
              </div>
              <div className="text-[10px] text-slate-500 truncate">
                Fingerprint: <span className="text-cyan-300">{n.ed25519Fingerprint}</span>
              </div>
              <div className="text-[10px] text-slate-500 truncate">
                Active Session Keys: <span className="text-slate-300">{Object.keys(n.activeSessionKeys).length} Peers</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
