/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { MeshSimulationEngine } from './engine/MeshEngine';
import { RoutingProtocolType } from './types/protocol';
import { TopBar, ActiveTab } from './components/TopBar';
import { TacticalCanvas } from './components/TacticalCanvas';
import { NodeDetailsPanel } from './components/NodeDetailsPanel';
import { ProtocolPanel } from './components/ProtocolPanel';
import { SecurityConsole } from './components/SecurityConsole';
import { DTNConsole } from './components/DTNConsole';
import { StandardsInspector } from './components/StandardsInspector';
import { BenchmarkDashboard } from './components/BenchmarkDashboard';
import { TransmitPacketModal } from './components/TransmitPacketModal';
import { RFInterferenceHeatmap } from './components/RFInterferenceHeatmap';
import {
  Activity,
  Radio,
  Shield,
  Layers,
  HardDrive,
  Cpu,
  Clock,
  AlertTriangle,
} from 'lucide-react';

export default function App() {
  // Instantiate protocol simulation engine
  const engineRef = useRef<MeshSimulationEngine | null>(null);
  if (!engineRef.current) {
    engineRef.current = new MeshSimulationEngine();
  }
  const engine = engineRef.current;

  // React state mirroring engine state for reactive rendering
  const [activeTab, setActiveTab] = useState<ActiveTab>('tactical_canvas');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedLinkPair, setSelectedLinkPair] = useState<{ nodeAId: string; nodeBId: string } | null>(null);
  const [activeProtocol, setActiveProtocol] = useState<RoutingProtocolType>(engine.activeProtocol);
  const [isPaused, setIsPaused] = useState<boolean>(engine.isPaused);
  const [simulationSpeed, setSimulationSpeed] = useState<number>(engine.simulationSpeed);
  const [isTransmitModalOpen, setIsTransmitModalOpen] = useState(false);
  const [rebootAnimationTrigger, setRebootAnimationTrigger] = useState<{ timestamp: number; nodeIds?: string[] } | null>(null);
  const [statusNotification, setStatusNotification] = useState<{ message: string; type: 'info' | 'alert' | 'success' } | null>({
    message: 'ARES-MESH Tactical Network initialized. All nodes mutual authenticated via Noise XX.',
    type: 'success',
  });

  // Render tick trigger state
  const [, setTickCounter] = useState(0);

  // 60 FPS Animation & Discrete-Event Simulation Loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const dt = currentTime - lastTime;
      lastTime = currentTime;

      if (engine) {
        engine.tick(dt);
        // Trigger React re-render
        setTickCounter(prev => (prev + 1) % 100000);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [engine]);

  // Handle Protocol Switch
  const handleChangeProtocol = (newProtocol: RoutingProtocolType) => {
    engine.setProtocol(newProtocol);
    setActiveProtocol(newProtocol);
    setStatusNotification({
      message: `Protocol switched to ${newProtocol}. Route convergence complete in ${engine.metrics.routeConvergenceTimeMs}ms.`,
      type: 'info',
    });
  };

  // Node Drag Updates
  const handleUpdateNodePosition = (nodeId: string, x: number, y: number) => {
    const node = engine.nodes.find(n => n.id === nodeId);
    if (node) {
      node.x = x;
      node.y = y;
      if (node.orbitCenter) {
        node.orbitCenter = { x, y };
      }
      engine.recomputeTopology();
    }
  };

  // Jammer Drag Updates
  const handleUpdateJammerPosition = (jammerId: string, x: number, y: number) => {
    const jammer = engine.jammingZones.find(j => j.id === jammerId);
    if (jammer) {
      jammer.x = x;
      jammer.y = y;
      engine.recomputeTopology();
    }
  };

  // Toggle Jammer Power
  const handleToggleJammer = (jammerId: string) => {
    const jammer = engine.jammingZones.find(j => j.id === jammerId);
    if (jammer) {
      jammer.active = !jammer.active;
      engine.recomputeTopology();
      setStatusNotification({
        message: jammer.active
          ? `EW Jamming Pod ${jammer.callsign} ACTIVATED. RF spectrum contested.`
          : `EW Jamming Pod ${jammer.callsign} deactivated. RF links restored.`,
        type: jammer.active ? 'alert' : 'success',
      });
    }
  };

  // Add Dynamic UAV Node
  const handleAddUavNode = () => {
    const count = engine.nodes.filter(n => n.role === 'uav').length + 1;
    const newId = `uav-0${count}`;
    const newUav = {
      id: newId,
      name: `MQ-9 Relay ${count} (Tactical Swarm)`,
      callsign: `REAPER-${count.toString().padStart(2, '0')}`,
      role: 'uav' as const,
      x: 450 + (Math.random() * 120 - 60),
      y: 260 + (Math.random() * 80 - 40),
      altitudeM: 6200,
      velocity: { vx: 0.2, vy: -0.1 },
      batteryPct: 95,
      txPowerDbm: 30,
      rxSensitivityDbm: -98,
      rangeRadius: 360,
      isMoving: true,
      orbitRadius: 75,
      orbitCenter: { x: 450, y: 260 },
      orbitAngle: Math.random() * Math.PI,
      ed25519Fingerprint: 'A1B2:C3D4:E5F6:7890',
      staticPublicKeyHex: 'c0ffeec0ffeec0ffeec0ffeec0ffeec0ffeec0ffeec0ffeec0ffeec0ffeec0ff',
      securityState: 'AUTHENTICATED_MUTUAL' as const,
      activeSessionKeys: {},
      replayWindow: { lastSequenceNumber: 0, windowBitmap: 0, windowSize: 64 },
      routingTable: [],
      olsrMprSet: [],
      batmanOgmSeq: 1,
      aodvSeq: 1,
      dtnCustodyQueue: [],
      stats: {
        packetsSent: 0,
        packetsRelayed: 0,
        packetsReceived: 0,
        packetsDropped: 0,
        dtnBundlesHeld: 0,
        securityDropsReplay: 0,
        securityDropsAuth: 0,
      },
    };
    engine.nodes.push(newUav);
    engine.recomputeTopology();
    setSelectedNodeId(newId);
    setStatusNotification({
      message: `Deployed high-altitude relay ${newUav.callsign} to airborne mesh.`,
      type: 'success',
    });
  };

  // Add Jammer
  const handleAddJammer = () => {
    const id = `ew-jammer-${Date.now().toString(36)}`;
    engine.jammingZones.push({
      id,
      callsign: 'BORISOGLEBSK-EW',
      x: 600,
      y: 320,
      radius: 130,
      powerDbm: 46,
      band: 'L-BAND',
      active: true,
    });
    engine.recomputeTopology();
    setStatusNotification({
      message: 'New hostile EW Directional Jamming Pod deployed into sector.',
      type: 'alert',
    });
  };

  // Update Jammer Parameters
  const handleUpdateJammerPower = (jammerId: string, powerDbm: number) => {
    const jammer = engine.jammingZones.find(j => j.id === jammerId);
    if (jammer) {
      jammer.powerDbm = powerDbm;
      engine.recomputeTopology();
    }
  };

  const handleUpdateJammerRadius = (jammerId: string, radius: number) => {
    const jammer = engine.jammingZones.find(j => j.id === jammerId);
    if (jammer) {
      jammer.radius = radius;
      engine.recomputeTopology();
    }
  };

  // Dispatch Packet Handler
  const handleDispatchPacket = (
    sourceId: string,
    targetId: string,
    type: 'STANAG_C2' | 'CCSDS_BUNDLE' | 'NOISE_HANDSHAKE' = 'STANAG_C2',
    options?: { isReplayed?: boolean; isTampered?: boolean; forceDtn?: boolean }
  ) => {
    const result = engine.dispatchPacket(sourceId, targetId, type, options);
    setStatusNotification({
      message: result.message,
      type: options?.isReplayed || options?.isTampered ? 'alert' : 'success',
    });
  };

  // Toggle Mobility
  const handleToggleMobility = (nodeId: string) => {
    const node = engine.nodes.find(n => n.id === nodeId);
    if (node) {
      node.isMoving = !node.isMoving;
      setStatusNotification({
        message: `${node.callsign} movement ${node.isMoving ? 'resumed' : 'halted'}.`,
        type: 'info',
      });
    }
  };

  // Bulk Node Commands
  const handleBulkReboot = (nodeIds: string[]) => {
    const res = engine.bulkRebootNodes(nodeIds);
    setRebootAnimationTrigger({ timestamp: Date.now(), nodeIds });
    setStatusNotification({
      message: `Bulk Transceivers Rebooted: ${res.recomputedCount} node(s) cleared routing state. Mesh converged in ${res.convergenceMs}ms.`,
      type: 'success',
    });
  };

  const handleBulkSyncSecurity = (nodeIds: string[]) => {
    const res = engine.bulkSyncSecurityState(nodeIds);
    setStatusNotification({
      message: `Bulk Zero-Trust Sync: ${nodeIds.length} nodes mutually authenticated across ${res.rekeyedPairs} peer links with Noise Protocol XX.`,
      type: 'success',
    });
  };

  const handleBulkToggleMobility = (nodeIds: string[]) => {
    const res = engine.bulkToggleMobility(nodeIds);
    setStatusNotification({
      message: `Mobility toggled for ${res.updatedCount} tactical assets.`,
      type: 'info',
    });
  };

  const handleBulkFlushDtn = (nodeIds: string[]) => {
    const res = engine.bulkFlushDtn(nodeIds);
    setStatusNotification({
      message: `Flushed ${res.flushedCount} CCSDS bundle(s) from custody storage across ${nodeIds.length} node(s).`,
      type: 'info',
    });
  };

  // Reset Scenario
  const handleResetScenario = () => {
    engine.initDefaultScenario();
    engine.recomputeTopology();
    setSelectedNodeId(null);
    setRebootAnimationTrigger({ timestamp: Date.now(), nodeIds: engine.nodes.map(n => n.id) });
    setStatusNotification({
      message: 'Tactical mesh topology reset to default expeditionary scenario.',
      type: 'info',
    });
  };

  const selectedNode = engine.nodes.find(n => n.id === selectedNodeId) || null;

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 flex flex-col font-sans">
      {/* 3-Zone Header Bar */}
      <TopBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenTransmitModal={() => setIsTransmitModalOpen(true)}
        isPaused={isPaused}
        onTogglePause={() => {
          engine.isPaused = !engine.isPaused;
          setIsPaused(engine.isPaused);
        }}
        onResetScenario={handleResetScenario}
      />

      {/* Real-time Status Alert / Notification Strip */}
      {statusNotification && (
        <div
          className={`px-6 py-2 text-xs font-mono flex items-center justify-between border-b transition-colors ${
            statusNotification.type === 'alert'
              ? 'bg-rose-950/40 border-rose-900/60 text-rose-300'
              : statusNotification.type === 'success'
              ? 'bg-cyan-950/30 border-cyan-900/40 text-cyan-300'
              : 'bg-slate-900/50 border-slate-800 text-slate-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-black/40 border border-white/10">
              TACTICAL ADVISORY
            </span>
            <span>{statusNotification.message}</span>
          </div>
          <button
            onClick={() => setStatusNotification(null)}
            className="text-slate-500 hover:text-slate-300 ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Workspace Stage */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 md:p-6 space-y-6">
        {/* VIEW 1: Tactical Operations Main Viewport */}
        {activeTab === 'tactical_canvas' && (
          <div className="space-y-6">
            {/* Top Quick Telemetry KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 font-mono text-xs">
              <div className="bg-[#0B0F19] border border-[#1E293B] p-2.5 rounded">
                <div className="text-[10px] text-slate-500 uppercase">Routing Engine</div>
                <div className="text-sm font-bold text-cyan-400 mt-0.5">{activeProtocol}</div>
              </div>
              <div className="bg-[#0B0F19] border border-[#1E293B] p-2.5 rounded">
                <div className="text-[10px] text-slate-500 uppercase">Avg Latency</div>
                <div className="text-sm font-bold text-slate-200 mt-0.5 tabular-nums">
                  {engine.metrics.averageLatencyMs} ms
                </div>
              </div>
              <div className="bg-[#0B0F19] border border-[#1E293B] p-2.5 rounded">
                <div className="text-[10px] text-slate-500 uppercase">Packet Delivery</div>
                <div className="text-sm font-bold text-emerald-400 mt-0.5 tabular-nums">
                  {engine.metrics.packetDeliveryRatioPct}%
                </div>
              </div>
              <div className="bg-[#0B0F19] border border-[#1E293B] p-2.5 rounded">
                <div className="text-[10px] text-slate-500 uppercase">Throughput</div>
                <div className="text-sm font-bold text-slate-200 mt-0.5 tabular-nums">
                  {engine.metrics.networkThroughputKbps} kbps
                </div>
              </div>
              <div className="bg-[#0B0F19] border border-[#1E293B] p-2.5 rounded">
                <div className="text-[10px] text-slate-500 uppercase">Operational Links</div>
                <div className="text-sm font-bold text-cyan-300 mt-0.5 tabular-nums">
                  {engine.links.filter(l => l.isOperational).length} / {engine.links.length}
                </div>
              </div>
              <div className="bg-[#0B0F19] border border-[#1E293B] p-2.5 rounded">
                <div className="text-[10px] text-slate-500 uppercase">DTN Custody Buffer</div>
                <div className="text-sm font-bold text-amber-400 mt-0.5 tabular-nums">
                  {engine.nodes.reduce((acc, n) => acc + n.dtnCustodyQueue.length, 0)} Bundles
                </div>
              </div>
            </div>

            {/* Canvas Stage & Asymmetric Node HUD Split */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Interactive Tactical RF Canvas (8 Cols) */}
              <div className="lg:col-span-8">
                <TacticalCanvas
                  nodes={engine.nodes}
                  jammingZones={engine.jammingZones}
                  links={engine.links}
                  inFlightPackets={engine.inFlightPackets}
                  activeProtocol={activeProtocol}
                  selectedNodeId={selectedNodeId}
                  selectedLinkPair={selectedLinkPair}
                  onSelectNode={setSelectedNodeId}
                  onSelectLinkPair={(a, b) => setSelectedLinkPair({ nodeAId: a, nodeBId: b })}
                  onUpdateNodePosition={handleUpdateNodePosition}
                  onUpdateJammerPosition={handleUpdateJammerPosition}
                  onToggleJammer={handleToggleJammer}
                  onAddJammer={handleAddJammer}
                  onAddUavNode={handleAddUavNode}
                  onBulkReboot={handleBulkReboot}
                  onBulkSyncSecurity={handleBulkSyncSecurity}
                  onBulkToggleMobility={handleBulkToggleMobility}
                  onBulkFlushDtn={handleBulkFlushDtn}
                  rebootTrigger={rebootAnimationTrigger}
                  simulationSpeed={simulationSpeed}
                  onChangeSpeed={(s) => {
                    engine.simulationSpeed = s;
                    setSimulationSpeed(s);
                  }}
                />
              </div>

              {/* Selected Node Inspector HUD (4 Cols) */}
              <div className="lg:col-span-4">
                <NodeDetailsPanel
                  node={selectedNode}
                  allNodes={engine.nodes}
                  links={engine.links}
                  activeProtocol={activeProtocol}
                  onDispatchPacket={(src, dst) => handleDispatchPacket(src, dst)}
                  onToggleMobility={handleToggleMobility}
                  onRebootNode={(id) => handleBulkReboot([id])}
                  onClose={() => setSelectedNodeId(null)}
                />
              </div>
            </div>
          </div>
        )}

        {/* VIEW: RF Signal Interference Heatmap & Sector Analyzer */}
        {activeTab === 'rf_heatmap' && (
          <RFInterferenceHeatmap
            nodes={engine.nodes}
            jammingZones={engine.jammingZones}
            links={engine.links}
            onUpdateJammerPower={handleUpdateJammerPower}
            onUpdateJammerRadius={handleUpdateJammerRadius}
            standalone={true}
          />
        )}

        {/* VIEW 2: Protocol Routing Comparative Engine */}
        {activeTab === 'protocol_engine' && (
          <ProtocolPanel
            activeProtocol={activeProtocol}
            onChangeProtocol={handleChangeProtocol}
            nodes={engine.nodes}
            routeConvergenceTimeMs={engine.metrics.routeConvergenceTimeMs}
          />
        )}

        {/* VIEW 3: Zero-Trust Security & Noise Protocol Inspector */}
        {activeTab === 'zero_trust' && (
          <SecurityConsole
            nodes={engine.nodes}
            onTriggerAttack={(src, dst, type) => {
              handleDispatchPacket(src, dst, 'STANAG_C2', {
                isReplayed: type === 'REPLAY',
                isTampered: type === 'TAMPER',
              });
            }}
          />
        )}

        {/* VIEW 4: Delay-Tolerant Networking (DTN) Custody Console */}
        {activeTab === 'dtn_custody' && (
          <DTNConsole
            nodes={engine.nodes}
            onDispatchDtnBundle={(src, dst) => {
              handleDispatchPacket(src, dst, 'CCSDS_BUNDLE', { forceDtn: true });
            }}
            onClearCustodyQueue={(nodeId) => {
              const node = engine.nodes.find(n => n.id === nodeId);
              if (node) {
                node.dtnCustodyQueue = [];
                node.stats.dtnBundlesHeld = 0;
                setStatusNotification({
                  message: `Cleared custody buffer at ${node.callsign}.`,
                  type: 'info',
                });
              }
            }}
          />
        )}

        {/* VIEW 5: Defense Standards & Byte-Level Telemetry Inspector */}
        {activeTab === 'standards' && <StandardsInspector />}

        {/* VIEW 6: Evaluation Benchmarks & Architecture Metrics */}
        {activeTab === 'benchmarks' && (
          <BenchmarkDashboard
            metrics={engine.metrics}
            activeProtocol={activeProtocol}
            packetHistory={engine.packetHistory}
          />
        )}
      </main>

      {/* Dispatch Packet Modal */}
      <TransmitPacketModal
        isOpen={isTransmitModalOpen}
        onClose={() => setIsTransmitModalOpen(false)}
        nodes={engine.nodes}
        onDispatch={handleDispatchPacket}
      />
    </div>
  );
}
