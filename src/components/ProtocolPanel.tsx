/**
 * Multi-Protocol Routing Architecture & Engine Inspector
 * Comparative analysis of B.A.T.M.A.N. V, OLSR, and AODV ad-hoc mesh algorithms.
 */

import React from 'react';
import { TacticalNode, RoutingProtocolType } from '../types/protocol';
import {
  Radio,
  Layers,
  Cpu,
  Clock,
  ArrowRight,
  ShieldCheck,
  Zap,
  Info,
} from 'lucide-react';

interface ProtocolPanelProps {
  activeProtocol: RoutingProtocolType;
  onChangeProtocol: (protocol: RoutingProtocolType) => void;
  nodes: TacticalNode[];
  routeConvergenceTimeMs: number;
}

export const ProtocolPanel: React.FC<ProtocolPanelProps> = ({
  activeProtocol,
  onChangeProtocol,
  nodes,
  routeConvergenceTimeMs,
}) => {
  return (
    <div className="space-y-6">
      {/* Protocol Selector Header Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 bg-[#0B0F19] border border-[#1E293B] rounded-lg">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            Ad-Hoc Mesh Routing Protocol Engine
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Evaluate convergence, control traffic overhead, and path optimality under high node mobility and electronic warfare.
          </p>
        </div>

        {/* Segmented Protocol Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-700/80 rounded-lg">
          <button
            onClick={() => onChangeProtocol('BATMAN_V')}
            className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
              activeProtocol === 'BATMAN_V'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            B.A.T.M.A.N. V
          </button>
          <button
            onClick={() => onChangeProtocol('OLSR')}
            className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
              activeProtocol === 'OLSR'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            OLSR (RFC 3626)
          </button>
          <button
            onClick={() => onChangeProtocol('AODV')}
            className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
              activeProtocol === 'AODV'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            AODV (RFC 3561)
          </button>
        </div>
      </div>

      {/* Protocol In-Depth Formulation & Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Card 1: Selected Protocol Architectural Deep-Dive */}
        <div className="lg:col-span-2 bg-[#0B0F19] border border-[#1E293B] rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
                ACTIVE PROTOCOL SPECIFICATION
              </span>
              <h3 className="text-sm font-bold text-slate-100 mt-0.5">
                {activeProtocol === 'BATMAN_V' && 'B.A.T.M.A.N. V (Better Approach To Mobile Ad-hoc Networking)'}
                {activeProtocol === 'OLSR' && 'OLSR (Optimized Link State Routing Protocol - RFC 3626)'}
                {activeProtocol === 'AODV' && 'AODV (Ad-hoc On-Demand Distance Vector Routing - RFC 3561)'}
              </h3>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-500 uppercase font-mono">Convergence</span>
              <div className="text-xs font-mono font-bold text-emerald-400 tabular-nums">
                {routeConvergenceTimeMs} ms
              </div>
            </div>
          </div>

          {/* Mathematical Formulations & Mechanism */}
          {activeProtocol === 'BATMAN_V' && (
            <div className="space-y-3 text-xs text-slate-300">
              <p>
                B.A.T.M.A.N. V operates at <strong>Layer 2 (Data Link)</strong>. Instead of learning the full global network topology, each tactical node merely identifies the <em>single best direct neighbor</em> to forward traffic for each destination.
              </p>
              
              <div className="p-3 bg-slate-950 rounded border border-slate-800 font-mono text-[11px] space-y-1.5">
                <div className="text-cyan-400 font-bold">MATHEMATICAL FORMULATION:</div>
                <div className="text-slate-300">
                  Transmit Quality (TQ): <span className="text-cyan-300 font-bold">TQ = TQ_local × TQ_echo</span>
                </div>
                <div className="text-slate-400 text-[10px]">
                  Hop Degradation: TQ_next = TQ_prev × (1 - Hop_Penalty) where Hop_Penalty ≈ 0.05
                </div>
                <div className="text-slate-400 text-[10px]">
                  Originator Message (OGMv2) Broadcast Frequency: 1000 ms sliding window of 64 packets
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div className="p-2.5 bg-slate-900/40 rounded border border-slate-800">
                  <div className="text-cyan-400 font-semibold mb-1">Tactical Strengths</div>
                  <ul className="text-slate-400 space-y-1 list-disc list-inside">
                    <li>Zero global route calculation overhead</li>
                    <li>Immune to counting-to-infinity routing loops</li>
                    <li>Layer-2 seamless roaming across mobile UAVs</li>
                  </ul>
                </div>
                <div className="p-2.5 bg-slate-900/40 rounded border border-slate-800">
                  <div className="text-amber-400 font-semibold mb-1">Tactical Trade-offs</div>
                  <ul className="text-slate-400 space-y-1 list-disc list-inside">
                    <li>Periodic OGM broadcast traffic on lossy RF</li>
                    <li>Convergence delay proportional to OGM interval</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeProtocol === 'OLSR' && (
            <div className="space-y-3 text-xs text-slate-300">
              <p>
                OLSR is a <strong>proactive link-state protocol</strong> designed for mobile ad-hoc networks. It solves the broadcast storm problem by electing a minimal set of <strong>Multi-Point Relays (MPRs)</strong> to flood Topology Control (TC) messages.
              </p>

              <div className="p-3 bg-slate-950 rounded border border-slate-800 font-mono text-[11px] space-y-1.5">
                <div className="text-cyan-400 font-bold">MPR SELECTION HEURISTIC:</div>
                <div className="text-slate-300">
                  {'MPR(u) = argmin |S| such that S ⊆ N1(u) and N2(u) ⊆ ⋃_{v ∈ S} N1(v)'}
                </div>
                <div className="text-slate-400 text-[10px]">
                  Link Metric: Expected Transmission Count (ETX) = 1 / (d_f × d_r)
                </div>
                <div className="text-slate-400 text-[10px]">
                  Reduces link-state broadcast overhead by up to 74% in dense swarms
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div className="p-2.5 bg-slate-900/40 rounded border border-slate-800">
                  <div className="text-cyan-400 font-semibold mb-1">Tactical Strengths</div>
                  <ul className="text-slate-400 space-y-1 list-disc list-inside">
                    <li>Instant zero-delay path availability</li>
                    <li>Optimal for dense ground-vehicle convoys</li>
                    <li>Deterministic shortest ETX paths</li>
                  </ul>
                </div>
                <div className="p-2.5 bg-slate-900/40 rounded border border-slate-800">
                  <div className="text-amber-400 font-semibold mb-1">Tactical Trade-offs</div>
                  <ul className="text-slate-400 space-y-1 list-disc list-inside">
                    <li>High memory footprint for 2-hop neighbor tables</li>
                    <li>Slower adaptation when MPR relays are jammed</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeProtocol === 'AODV' && (
            <div className="space-y-3 text-xs text-slate-300">
              <p>
                AODV is a <strong>reactive on-demand protocol</strong>. Nodes discover routes strictly when a packet needs to be sent, eliminating periodic control broadcasts when the network is quiet.
              </p>

              <div className="p-3 bg-slate-950 rounded border border-slate-800 font-mono text-[11px] space-y-1.5">
                <div className="text-cyan-400 font-bold">ROUTE DISCOVERY FORMULATION:</div>
                <div className="text-slate-300">
                  RREQ Broadcast: &lt;RREQ_ID, Source_IP, Source_Seq, Dest_IP, Dest_Seq, Hop_Count&gt;
                </div>
                <div className="text-slate-400 text-[10px]">
                  Loop Prevention: Route accepted iff Dest_Seq(new) &gt; Dest_Seq(cached)
                </div>
                <div className="text-slate-400 text-[10px]">
                  Route Lifetime: Active routes expire after ACTIVE_ROUTE_TIMEOUT (8000 ms)
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div className="p-2.5 bg-slate-900/40 rounded border border-slate-800">
                  <div className="text-cyan-400 font-semibold mb-1">Tactical Strengths</div>
                  <ul className="text-slate-400 space-y-1 list-disc list-inside">
                    <li>Minimal bandwidth usage on low-data channels</li>
                    <li>Lowest memory footprint on constrained radios</li>
                    <li>Rapid route error (RERR) localized repair</li>
                  </ul>
                </div>
                <div className="p-2.5 bg-slate-900/40 rounded border border-slate-800">
                  <div className="text-amber-400 font-semibold mb-1">Tactical Trade-offs</div>
                  <ul className="text-slate-400 space-y-1 list-disc list-inside">
                    <li>Initial packet latency while waiting for RREP</li>
                    <li>Vulnerable to RREQ broadcast storm if unconstrained</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Card 2: Defense Metric Comparison Table */}
        <div className="bg-[#0B0F19] border border-[#1E293B] rounded-lg p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-cyan-400" />
            Military Evaluation Matrix
          </h3>

          <div className="space-y-3 text-xs">
            <div className="p-2.5 bg-slate-950 rounded border border-slate-800 space-y-1">
              <div className="flex justify-between font-mono">
                <span className="text-slate-400">Control Traffic:</span>
                <span className="text-cyan-300 font-semibold">
                  {activeProtocol === 'AODV' ? 'Low (On-Demand)' : activeProtocol === 'OLSR' ? 'Medium (MPR Optimized)' : 'Medium (OGM Beacons)'}
                </span>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-slate-400">Route Latency:</span>
                <span className="text-emerald-400 font-semibold">
                  {activeProtocol === 'AODV' ? 'Initial delay (RREQ)' : 'Instant (Proactive)'}
                </span>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-slate-400">Memory Per Node:</span>
                <span className="text-slate-200 font-semibold tabular-nums">
                  {activeProtocol === 'BATMAN_V' ? '380 KB' : activeProtocol === 'OLSR' ? '490 KB' : '260 KB'}
                </span>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-slate-400">Loop Prevention:</span>
                <span className="text-emerald-400 font-semibold">
                  {activeProtocol === 'BATMAN_V' ? 'TQ Metric Filtering' : activeProtocol === 'OLSR' ? 'Sequence / TC' : 'Dest Sequence No'}
                </span>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-slate-400">Mobility Tolerance:</span>
                <span className="text-cyan-300 font-semibold">
                  {activeProtocol === 'BATMAN_V' ? 'Excellent (Swarm)' : activeProtocol === 'OLSR' ? 'Moderate' : 'High'}
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-900/50 rounded border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
              <strong className="text-slate-200">Evaluator Recommendation:</strong> In contested electronic warfare theaters with fast-moving UAV relays, <strong>B.A.T.M.A.N. V</strong> delivers highest resilience against intermittent RF drops due to its distributed next-hop architecture.
            </div>
          </div>
        </div>
      </div>

      {/* Network-Wide Routing Table Matrix */}
      <div className="bg-[#0B0F19] border border-[#1E293B] rounded-lg p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
            <Radio className="w-4 h-4 text-cyan-400" />
            Network Topology Routing Matrix ({activeProtocol})
          </h3>
          <span className="text-xs font-mono text-slate-500">
            {nodes.length} Tactical Nodes Active
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono text-left">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                <th className="py-2 px-3">Node Callsign</th>
                <th className="py-2 px-3">Role</th>
                <th className="py-2 px-3">Active Routes</th>
                <th className="py-2 px-3">Next Hops</th>
                <th className="py-2 px-3">Avg Metric</th>
                <th className="py-2 px-3">DTN Buffers</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {nodes.map(n => {
                const nextHops = Array.from(new Set(n.routingTable.map(r => r.nextHopId)));
                const avgMetric = n.routingTable.length > 0
                  ? Math.round(n.routingTable.reduce((acc, r) => acc + r.metric, 0) / n.routingTable.length)
                  : 0;
                return (
                  <tr key={n.id} className="hover:bg-slate-900/40">
                    <td className="py-2.5 px-3 font-bold text-cyan-300">{n.callsign}</td>
                    <td className="py-2.5 px-3 text-slate-400 uppercase text-[10px]">{n.role}</td>
                    <td className="py-2.5 px-3 tabular-nums">{n.routingTable.length} Routes</td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {nextHops.length > 0 ? nextHops.join(', ') : 'None (Isolated)'}
                    </td>
                    <td className="py-2.5 px-3 tabular-nums text-emerald-400">
                      {activeProtocol === 'BATMAN_V' ? `${avgMetric}/255 TQ` : activeProtocol === 'OLSR' ? `${avgMetric} ETX` : `${avgMetric} Hops`}
                    </td>
                    <td className="py-2.5 px-3 tabular-nums text-amber-400 font-semibold">
                      {n.dtnCustodyQueue.length}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
