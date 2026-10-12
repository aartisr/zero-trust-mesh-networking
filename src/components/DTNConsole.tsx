/**
 * Delay-Tolerant Networking (DTN) & CCSDS Bundle Protocol RFC 9171 Console
 * Demonstrates store-and-forward custody transfer across contested or severed links.
 */

import React from 'react';
import { TacticalNode } from '../types/protocol';
import {
  HardDrive,
  Clock,
  ShieldCheck,
  Send,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Database,
  Radio,
} from 'lucide-react';

interface DTNConsoleProps {
  nodes: TacticalNode[];
  onDispatchDtnBundle: (sourceId: string, targetId: string) => void;
  onClearCustodyQueue: (nodeId: string) => void;
}

export const DTNConsole: React.FC<DTNConsoleProps> = ({
  nodes,
  onDispatchDtnBundle,
  onClearCustodyQueue,
}) => {
  const nodesWithBundles = nodes.filter(n => n.dtnCustodyQueue.length > 0);
  const totalBundlesHeld = nodes.reduce((acc, n) => acc + n.dtnCustodyQueue.length, 0);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-4 bg-[#0B0F19] border border-[#1E293B] rounded-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-amber-400" />
            Delay-Tolerant Networking (DTN) & Custody Transfer
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            CCSDS 734.2-B-1 / RFC 9171 Bundle Protocol Version 7. Resilient store-and-forward communication for high-latency or intermittent RF environments.
          </p>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded">
            <span className="text-slate-500 uppercase text-[10px] block">Bundles in Custody</span>
            <span className="text-amber-400 font-bold tabular-nums text-sm">{totalBundlesHeld} Held</span>
          </div>
          <button
            onClick={() => {
              if (nodes.length >= 2) {
                // Dispatch to farthest node with forced DTN
                onDispatchDtnBundle(nodes[2]?.id || nodes[0].id, nodes[4]?.id || nodes[1].id);
              }
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Generate DTN Bundle</span>
          </button>
        </div>
      </div>

      {/* DTN Architecture Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Card 1: Bundle Protocol RFC 9171 Specification */}
        <div className="lg:col-span-2 bg-[#0B0F19] border border-[#1E293B] rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider">
                SPACE & TACTICAL PROTOCOL STANDARD
              </span>
              <h3 className="text-sm font-bold text-slate-100 mt-0.5">
                CCSDS 734.2-B-1 / RFC 9171 (BPv7) Mechanics
              </h3>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-mono bg-amber-950/60 border border-amber-700/60 text-amber-300 rounded">
              RFC 9171 Compliant
            </span>
          </div>

          <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
            <p>
              Traditional TCP/IP networks assume continuous end-to-end connectivity. In contested expeditionary or deep-space theaters, links suffer from high propagation delays and frequent line-of-sight dropouts. DTN overlays a <strong>Bundle Layer</strong> between application and transport protocols.
            </p>

            <div className="p-3 bg-slate-950 rounded border border-slate-800 font-mono text-[11px] space-y-1.5">
              <div className="text-amber-400 font-bold">CUSTODY TRANSFER GUARANTEE:</div>
              <div className="text-slate-300">
                1. Custodian Node <code className="text-cyan-300">C_n</code> retains bundle in non-volatile flash storage.
              </div>
              <div className="text-slate-300">
                2. On opportunistic contact with Relay <code className="text-cyan-300">C_n+1</code>, bundle is forwarded over authenticated link.
              </div>
              <div className="text-slate-300">
                3. <code className="text-cyan-300">C_n+1</code> returns cryptographic Custody Acceptance Signal. Only then does <code className="text-cyan-300">C_n</code> release local custody.
              </div>
              <div className="text-slate-500 text-[10px]">
                Bundle Expiration: Time-To-Live (TTL) is enforced against creation timestamp to prevent buffer bloat.
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-[11px] pt-1">
              <div className="p-2.5 bg-slate-900/40 rounded border border-slate-800">
                <div className="text-amber-400 font-semibold mb-1">Intermittent RF</div>
                <p className="text-slate-400 text-[10px]">
                  Handles UAV line-of-sight blockages caused by terrain or maneuvering banking angles.
                </p>
              </div>
              <div className="p-2.5 bg-slate-900/40 rounded border border-slate-800">
                <div className="text-amber-400 font-semibold mb-1">Zero Data Loss</div>
                <p className="text-slate-400 text-[10px]">
                  Payloads survive node disconnections rather than being dropped at the router buffer.
                </p>
              </div>
              <div className="p-2.5 bg-slate-900/40 rounded border border-slate-800">
                <div className="text-amber-400 font-semibold mb-1">Deep-Space Heritage</div>
                <p className="text-slate-400 text-[10px]">
                  NASA/ESA standardized architecture deployed on Mars Reconnaissance Orbiter and ISS.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Interactive Store-and-Forward Scenario Guide */}
        <div className="bg-[#0B0F19] border border-[#1E293B] rounded-lg p-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
            <Radio className="w-4 h-4 text-amber-400" />
            Testing DTN In Tactical Canvas
          </h3>

          <div className="space-y-2 text-xs text-slate-400">
            <div className="p-2.5 bg-slate-950 rounded border border-slate-800 space-y-1">
              <div className="text-slate-200 font-semibold font-mono text-[11px]">How To Test Store & Forward:</div>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-400">
                <li>Activate the <strong>EW Jamming Pod</strong> on the Tactical Canvas to sever a relay path.</li>
                <li>Click <strong>Dispatch Packet</strong> or use the test button above.</li>
                <li>Notice the packet is automatically encapsulated as a <strong>CCSDS RFC 9171 Bundle</strong> and preserved in the node's flash custody buffer.</li>
                <li>Disable the jammer or drag the UAV into range: observe the bundle automatically transferred and delivered!</li>
              </ol>
            </div>

            <div className="p-3 bg-amber-950/20 border border-amber-800/40 rounded text-[11px] text-amber-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                Custody buffers protect high-value mission payloads (FLIR thermal captures, STANAG C2 telemetry) from electronic warfare RF denial.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Custody Buffer Directory Table */}
      <div className="bg-[#0B0F19] border border-[#1E293B] rounded-lg p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Database className="w-4 h-4 text-amber-400" />
            Active Node Custody Flash Queues
          </h3>
          <span className="text-xs font-mono text-slate-500">
            {nodesWithBundles.length} Node(s) Currently Holding Custody
          </span>
        </div>

        {nodesWithBundles.length === 0 ? (
          <div className="p-6 bg-slate-950/40 rounded border border-slate-800 text-center text-xs text-slate-500 font-mono">
            All tactical links are currently nominal. No bundles are currently held in custody buffers.
          </div>
        ) : (
          <div className="space-y-3">
            {nodesWithBundles.map(node => (
              <div key={node.id} className="p-3 bg-slate-950 rounded border border-slate-800 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-200 text-xs font-mono">{node.callsign}</span>
                    <span className="text-[10px] text-slate-500 font-mono">({node.name})</span>
                    <span className="px-1.5 py-0.5 text-[9px] bg-amber-950/80 text-amber-400 border border-amber-800 rounded font-mono">
                      {node.dtnCustodyQueue.length} Bundle(s) in Custody
                    </span>
                  </div>
                  <button
                    onClick={() => onClearCustodyQueue(node.id)}
                    className="text-[10px] text-slate-500 hover:text-slate-300 font-mono underline"
                  >
                    Clear Queue
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {node.dtnCustodyQueue.map((bundle, bIdx) => (
                    <div
                      key={bIdx}
                      className="p-2 bg-slate-900/60 rounded border border-slate-800 text-[10px] font-mono space-y-1"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-amber-300 font-bold">{bundle.bundleId}</span>
                        <span className="text-emerald-400">Custody Accepted</span>
                      </div>
                      <div className="text-slate-400">
                        {bundle.sourceEid} ➔ {bundle.destinationEid}
                      </div>
                      <div className="flex justify-between text-slate-500 text-[9px]">
                        <span>Payload: {bundle.payloadType} ({bundle.payloadBytes} B)</span>
                        <span>TTL: {bundle.lifetimeSeconds}s remaining</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
