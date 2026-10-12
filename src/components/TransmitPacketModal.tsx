/**
 * Tactical Packet Dispatch Modal
 * Enables constructing NATO STANAG 4586, CCSDS DTN, and Zero-Trust test payloads.
 */

import React, { useState } from 'react';
import { TacticalNode } from '../types/protocol';
import {
  Send,
  X,
  Shield,
  ShieldAlert,
  HardDrive,
  Radio,
  Lock,
} from 'lucide-react';

interface TransmitPacketModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: TacticalNode[];
  onDispatch: (
    sourceId: string,
    targetId: string,
    type: 'STANAG_C2' | 'CCSDS_BUNDLE' | 'NOISE_HANDSHAKE',
    options?: {
      isReplayed?: boolean;
      isTampered?: boolean;
      forceDtn?: boolean;
    }
  ) => void;
}

export const TransmitPacketModal: React.FC<TransmitPacketModalProps> = ({
  isOpen,
  onClose,
  nodes,
  onDispatch,
}) => {
  if (!isOpen) return null;

  const [sourceId, setSourceId] = useState<string>(nodes[0]?.id || '');
  const [targetId, setTargetId] = useState<string>(nodes[4]?.id || nodes[1]?.id || '');
  const [packetType, setPacketType] = useState<'STANAG_C2' | 'CCSDS_BUNDLE' | 'NOISE_HANDSHAKE'>('STANAG_C2');
  const [mode, setMode] = useState<'NOMINAL' | 'REPLAY_ATTACK' | 'MITM_TAMPER' | 'FORCE_DTN'>('NOMINAL');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (sourceId === targetId) return;

    onDispatch(sourceId, targetId, packetType, {
      isReplayed: mode === 'REPLAY_ATTACK',
      isTampered: mode === 'MITM_TAMPER',
      forceDtn: mode === 'FORCE_DTN',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none">
      <div className="w-full max-w-lg bg-[#0B0F19] border border-[#1E293B] rounded-lg shadow-2xl p-5 space-y-4 font-mono text-xs text-slate-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-slate-100 font-sans tracking-wide">
              Dispatch Tactical Mission Packet
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 p-1 hover:bg-slate-800 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Source & Destination Selector */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 uppercase block mb-1">
                Originating Source Node
              </label>
              <select
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200"
              >
                {nodes.map(n => (
                  <option key={n.id} value={n.id}>{n.callsign} ({n.name})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 uppercase block mb-1">
                Target Destination Node
              </label>
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200"
              >
                {nodes.filter(n => n.id !== sourceId).map(n => (
                  <option key={n.id} value={n.id}>{n.callsign} ({n.name})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Packet Protocol Type */}
          <div>
            <label className="text-[10px] text-slate-400 uppercase block mb-1.5">
              Protocol Framing Standard
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPacketType('STANAG_C2')}
                className={`p-2 rounded border text-left transition-colors ${
                  packetType === 'STANAG_C2'
                    ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <div className="font-bold text-[11px]">STANAG 4586</div>
                <div className="text-[9px] text-slate-500 mt-0.5">UAV C2 Telemetry</div>
              </button>

              <button
                type="button"
                onClick={() => setPacketType('CCSDS_BUNDLE')}
                className={`p-2 rounded border text-left transition-colors ${
                  packetType === 'CCSDS_BUNDLE'
                    ? 'bg-amber-950/80 border-amber-500 text-amber-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <div className="font-bold text-[11px]">CCSDS 9171</div>
                <div className="text-[9px] text-slate-500 mt-0.5">DTN Bundle (BPv7)</div>
              </button>

              <button
                type="button"
                onClick={() => setPacketType('NOISE_HANDSHAKE')}
                className={`p-2 rounded border text-left transition-colors ${
                  packetType === 'NOISE_HANDSHAKE'
                    ? 'bg-purple-950/80 border-purple-500 text-purple-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <div className="font-bold text-[11px]">Noise XX Ping</div>
                <div className="text-[9px] text-slate-500 mt-0.5">Curve25519 Handshake</div>
              </button>
            </div>
          </div>

          {/* Transmission Security Mode & Attack Simulation */}
          <div>
            <label className="text-[10px] text-slate-400 uppercase block mb-1.5">
              Zero-Trust Verification Mode
            </label>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <label
                className={`p-2.5 rounded border cursor-pointer flex items-center gap-2 ${
                  mode === 'NOMINAL'
                    ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                <input
                  type="radio"
                  name="sec_mode"
                  checked={mode === 'NOMINAL'}
                  onChange={() => setMode('NOMINAL')}
                  className="hidden"
                />
                <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <div className="font-bold">Nominal Authenticated</div>
                  <div className="text-[9px] text-slate-400">Valid ChaCha20-Poly1305</div>
                </div>
              </label>

              <label
                className={`p-2.5 rounded border cursor-pointer flex items-center gap-2 ${
                  mode === 'REPLAY_ATTACK'
                    ? 'bg-rose-950/40 border-rose-500 text-rose-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                <input
                  type="radio"
                  name="sec_mode"
                  checked={mode === 'REPLAY_ATTACK'}
                  onChange={() => setMode('REPLAY_ATTACK')}
                  className="hidden"
                />
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                <div>
                  <div className="font-bold">Replay Injection Attack</div>
                  <div className="text-[9px] text-slate-400">Tests 64-bit anti-replay</div>
                </div>
              </label>

              <label
                className={`p-2.5 rounded border cursor-pointer flex items-center gap-2 ${
                  mode === 'MITM_TAMPER'
                    ? 'bg-amber-950/40 border-amber-500 text-amber-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                <input
                  type="radio"
                  name="sec_mode"
                  checked={mode === 'MITM_TAMPER'}
                  onChange={() => setMode('MITM_TAMPER')}
                  className="hidden"
                />
                <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <div className="font-bold">MITM Cipher Tamper</div>
                  <div className="text-[9px] text-slate-400">Corrupts MAC tag bytes</div>
                </div>
              </label>

              <label
                className={`p-2.5 rounded border cursor-pointer flex items-center gap-2 ${
                  mode === 'FORCE_DTN'
                    ? 'bg-amber-950/40 border-amber-500 text-amber-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                <input
                  type="radio"
                  name="sec_mode"
                  checked={mode === 'FORCE_DTN'}
                  onChange={() => setMode('FORCE_DTN')}
                  className="hidden"
                />
                <HardDrive className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <div className="font-bold">Force DTN Custody</div>
                  <div className="text-[9px] text-slate-400">Store-and-forward queue</div>
                </div>
              </label>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-1.5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold rounded text-xs transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Inject Packet Into Mesh</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
