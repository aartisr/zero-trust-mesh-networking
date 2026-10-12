/**
 * Selected Tactical Node HUD & Cryptographic State Inspector
 */

import React from 'react';
import { TacticalNode, RFLink, RoutingProtocolType } from '../types/protocol';
import {
  Shield,
  Radio,
  Zap,
  Crosshair,
  Key,
  HardDrive,
  Send,
  Lock,
  ArrowRight,
  RotateCw,
} from 'lucide-react';

interface NodeDetailsPanelProps {
  node: TacticalNode | null;
  allNodes: TacticalNode[];
  links: RFLink[];
  activeProtocol: RoutingProtocolType;
  onDispatchPacket: (sourceId: string, targetId: string) => void;
  onToggleMobility: (nodeId: string) => void;
  onRebootNode?: (nodeId: string) => void;
  onClose: () => void;
}

export const NodeDetailsPanel: React.FC<NodeDetailsPanelProps> = ({
  node,
  allNodes,
  links,
  activeProtocol,
  onDispatchPacket,
  onToggleMobility,
  onRebootNode,
  onClose,
}) => {
  if (!node) {
    return (
      <div className="bg-[#0B0F19] border border-[#1E293B] rounded-lg p-5 text-center text-slate-500 font-mono text-xs flex flex-col items-center justify-center h-full min-h-[300px]">
        <Crosshair className="w-8 h-8 text-slate-600 mb-2" />
        <p className="text-slate-400 font-medium">No Tactical Node Selected</p>
        <p className="text-[11px] text-slate-600 mt-1">
          Click any UAV, squad patrol, or command post on the canvas to inspect routing tables, Noise keys, and RF telemetry.
        </p>
      </div>
    );
  }

  // Neighbor links
  const nodeLinks = links.filter(l => l.nodeAId === node.id || l.nodeBId === node.id);

  return (
    <div className="bg-[#0B0F19] border border-[#1E293B] rounded-lg p-4 font-mono text-xs text-slate-300 space-y-4">
      {/* Node Header */}
      <div className="flex items-start justify-between border-b border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-100 font-sans tracking-wide">
              {node.name}
            </span>
            <span className="px-1.5 py-0.5 text-[10px] bg-cyan-950/80 border border-cyan-800 text-cyan-300 rounded">
              {node.callsign}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Role: <span className="text-slate-200 uppercase">{node.role.replace('_', ' ')}</span> · MGRS: [{node.x.toFixed(0)}, {node.y.toFixed(0)}] · Alt: {node.altitudeM}m
          </div>
        </div>

        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-300 text-sm px-1.5 py-0.5 hover:bg-slate-800 rounded"
        >
          ✕
        </button>
      </div>

      {/* RF & Power Telemetry Strip */}
      <div className="grid grid-cols-4 gap-2 text-center bg-slate-900/60 p-2.5 rounded border border-slate-800/80">
        <div>
          <div className="text-[10px] text-slate-500 uppercase">TX Power</div>
          <div className="text-xs font-semibold text-slate-200 mt-0.5 tabular-nums">
            {node.txPowerDbm} dBm
          </div>
        </div>
        <div>
          <div className="text-[10px] text-slate-500 uppercase">RX Sens</div>
          <div className="text-xs font-semibold text-slate-200 mt-0.5 tabular-nums">
            {node.rxSensitivityDbm} dBm
          </div>
        </div>
        <div>
          <div className="text-[10px] text-slate-500 uppercase">Battery</div>
          <div className={`text-xs font-semibold mt-0.5 tabular-nums ${node.batteryPct > 70 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {node.batteryPct}%
          </div>
        </div>
        <div>
          <div className="text-[10px] text-slate-500 uppercase">DTN Queue</div>
          <div className="text-xs font-semibold text-amber-400 mt-0.5 tabular-nums">
            {node.dtnCustodyQueue.length} Bundles
          </div>
        </div>
      </div>

      {/* Zero-Trust Cryptographic State */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-sans font-semibold text-slate-300">
          <span className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-cyan-400" />
            Zero-Trust Noise Protocol State
          </span>
          <span className="text-emerald-400 text-[10px]">
            ● Mutual Authenticated
          </span>
        </div>

        <div className="bg-slate-950 p-2 rounded border border-slate-800 text-[10px] space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-500">Ed25519 Fingerprint:</span>
            <span className="text-cyan-300 font-mono select-all">
              {node.ed25519Fingerprint}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Anti-Replay Window:</span>
            <span className="text-slate-300 font-mono">
              Last Seq: #{node.replayWindow.lastSequenceNumber} · Bitmap: 0x{node.replayWindow.windowBitmap.toString(16).toUpperCase()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Handshake Suite:</span>
            <span className="text-slate-400">Noise_XX_25519_ChaChaPoly_BLAKE2s</span>
          </div>
        </div>
      </div>

      {/* Active Routing Table for Active Protocol */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-sans font-semibold text-slate-300">
          <span className="flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            Active Routing Table ({activeProtocol})
          </span>
          <span className="text-slate-500 text-[10px]">
            {node.routingTable.length} Routes
          </span>
        </div>

        <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
          {node.routingTable.length === 0 ? (
            <div className="text-[11px] text-slate-500 italic p-2 bg-slate-950/40 rounded border border-slate-800 text-center">
              No active routes available (isolated or jammed)
            </div>
          ) : (
            node.routingTable.map((route, idx) => {
              const destNode = allNodes.find(n => n.id === route.destinationId);
              const nextNode = allNodes.find(n => n.id === route.nextHopId);
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between p-1.5 bg-slate-950/60 rounded border border-slate-800/80 text-[10px]"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-200 font-bold">{destNode?.callsign || route.destinationId}</span>
                    <ArrowRight className="w-2.5 h-2.5 text-slate-500" />
                    <span className="text-cyan-400">{nextNode?.callsign || route.nextHopId}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 tabular-nums">{route.metricLabel}</span>
                    <span className="text-slate-500 text-[9px]">({route.hopCount}h)</span>
                    <button
                      onClick={() => onDispatchPacket(node.id, route.destinationId)}
                      className="px-1.5 py-0.5 bg-cyan-950 hover:bg-cyan-900 border border-cyan-700/60 text-cyan-300 rounded text-[9px] transition-colors"
                      title="Send packet to destination"
                    >
                      Ping
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Delay-Tolerant Networking (DTN) Custody Buffer */}
      {node.dtnCustodyQueue.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-sans font-semibold text-amber-400">
            <span className="flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-amber-400" />
              DTN Custody Flash Buffer (RFC 9171)
            </span>
            <span className="text-[10px] text-amber-500">
              Store & Forward Active
            </span>
          </div>

          <div className="space-y-1 max-h-24 overflow-y-auto">
            {node.dtnCustodyQueue.map((b, idx) => (
              <div
                key={idx}
                className="p-1.5 bg-amber-950/20 border border-amber-800/40 rounded text-[10px] flex items-center justify-between"
              >
                <div>
                  <div className="text-amber-300 font-bold">{b.bundleId}</div>
                  <div className="text-slate-400 text-[9px]">{b.sourceEid} → {b.destinationEid}</div>
                </div>
                <div className="text-right">
                  <div className="text-slate-300">{b.payloadBytes} B</div>
                  <div className="text-amber-400/80 text-[9px]">TTL: {b.lifetimeSeconds}s</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Operational Controls */}
      <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
        <button
          onClick={() => onToggleMobility(node.id)}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded text-xs transition-colors"
        >
          <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
          <span>{node.isMoving ? 'Halt Movement' : 'Resume Patrol'}</span>
        </button>

        {onRebootNode && (
          <button
            onClick={() => onRebootNode(node.id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-700/80 text-cyan-300 rounded text-xs transition-colors font-medium"
            title="Reboot node transceiver, flush routes, and smoothly re-animate mesh convergence"
          >
            <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
            <span>Reboot Node</span>
          </button>
        )}
      </div>
    </div>
  );
};
