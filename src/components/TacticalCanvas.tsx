/**
 * 2D Tactical RF Battlefield Operations Canvas
 * Renders nodes, RF links, EW jamming pods, packet animations, and MGRS grid.
 */

import React, { useRef, useState, useEffect } from 'react';
import {
  TacticalNode,
  JammingZone,
  RFLink,
  InFlightPacket,
  RoutingProtocolType,
} from '../types/protocol';
import {
  Radio,
  Shield,
  Zap,
  Eye,
  Crosshair,
  Volume2,
  VolumeX,
  Plus,
  Play,
  RotateCcw,
  Activity,
  Lock,
  RotateCw,
  ShieldCheck,
  HardDrive,
  MousePointer,
} from 'lucide-react';
import { LinkQualityPlot } from './LinkQualityPlot';

interface TacticalCanvasProps {
  nodes: TacticalNode[];
  jammingZones: JammingZone[];
  links: RFLink[];
  inFlightPackets: InFlightPacket[];
  activeProtocol: RoutingProtocolType;
  selectedNodeId: string | null;
  selectedLinkPair?: { nodeAId: string; nodeBId: string } | null;
  selectedNodeIds?: string[];
  onSelectNode: (nodeId: string | null) => void;
  onSelectLinkPair?: (nodeAId: string, nodeBId: string) => void;
  onSelectNodeIds?: (nodeIds: string[]) => void;
  onBulkReboot?: (nodeIds: string[]) => void;
  onBulkSyncSecurity?: (nodeIds: string[]) => void;
  onBulkToggleMobility?: (nodeIds: string[]) => void;
  onBulkFlushDtn?: (nodeIds: string[]) => void;
  onUpdateNodePosition: (nodeId: string, x: number, y: number) => void;
  onUpdateJammerPosition: (jammerId: string, x: number, y: number) => void;
  onToggleJammer: (jammerId: string) => void;
  onAddJammer: () => void;
  onAddUavNode: () => void;
  simulationSpeed: number;
  onChangeSpeed: (speed: number) => void;
}

export const TacticalCanvas: React.FC<TacticalCanvasProps> = ({
  nodes,
  jammingZones,
  links,
  inFlightPackets,
  activeProtocol,
  selectedNodeId,
  selectedLinkPair = null,
  selectedNodeIds,
  onSelectNode,
  onSelectLinkPair,
  onSelectNodeIds,
  onBulkReboot,
  onBulkSyncSecurity,
  onBulkToggleMobility,
  onBulkFlushDtn,
  onUpdateNodePosition,
  onUpdateJammerPosition,
  onToggleJammer,
  onAddJammer,
  onAddUavNode,
  simulationSpeed,
  onChangeSpeed,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const heatmapCanvasRef = useRef<HTMLCanvasElement>(null);
  const [showCoverageMap, setShowCoverageMap] = useState(true);
  const [showLinks, setShowLinks] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showLinkPlot, setShowLinkPlot] = useState(false);
  const [internalSelectedPair, setInternalSelectedPair] = useState<{ nodeAId: string; nodeBId: string } | null>(null);
  const [internalSelectedNodeIds, setInternalSelectedNodeIds] = useState<string[]>([]);
  const effectiveSelectedNodeIds = selectedNodeIds !== undefined ? selectedNodeIds : internalSelectedNodeIds;
  const setEffectiveSelectedNodeIds = (ids: string[]) => {
    setInternalSelectedNodeIds(ids);
    onSelectNodeIds?.(ids);
  };

  const [selectionBox, setSelectionBox] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  const [draggedEntity, setDraggedEntity] = useState<{
    type: 'node' | 'jammer';
    id: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  // Real-time canvas heatmap layer rendering
  useEffect(() => {
    if (!showHeatmap) return;
    const canvas = heatmapCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = 1000;
    const h = 620;
    ctx.clearRect(0, 0, w, h);
    const activeJammers = jammingZones.filter(j => j.active);
    if (activeJammers.length === 0) return;

    const step = 18;
    const cols = Math.ceil(w / step);
    const rows = Math.ceil(h / step);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const px = c * step;
        const py = r * step;

        let totalJamMw = 0;
        for (const j of activeJammers) {
          const dPx = Math.sqrt((px - j.x) ** 2 + (py - j.y) ** 2);
          const dM = Math.max(8, dPx * 12.5);
          const pl = 20 * Math.log10(dM) + 20 * Math.log10(2400) - 27.55;
          const rxDbm = j.powerDbm - pl;
          totalJamMw += Math.pow(10, rxDbm / 10);
        }

        const jamDbm = totalJamMw > 0 ? 10 * Math.log10(totalJamMw) : -120;
        if (jamDbm < -92) continue;

        let rVal = 0, gVal = 0, bVal = 0, aVal = 0;
        if (jamDbm < -75) {
          rVal = 6; gVal = 182; bVal = 212; aVal = 0.14;
        } else if (jamDbm < -60) {
          rVal = 245; gVal = 158; bVal = 11; aVal = 0.38;
        } else if (jamDbm < -42) {
          rVal = 239; gVal = 68; bVal = 68; aVal = 0.65;
        } else {
          rVal = 255; gVal = 120; bVal = 160; aVal = 0.85;
        }

        ctx.fillStyle = `rgba(${rVal}, ${gVal}, ${bVal}, ${aVal})`;
        ctx.fillRect(px, py, step, step);
      }
    }
  }, [showHeatmap, jammingZones]);

  // Mouse drag & box select handling
  const handleContainerMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('select') || target.closest('input')) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setSelectionBox({
      startX: x,
      startY: y,
      currentX: x,
      currentY: y,
    });
  };

  const handleNodeMouseDown = (e: React.MouseEvent, node: TacticalNode) => {
    e.stopPropagation();
    if (e.shiftKey) {
      const exists = effectiveSelectedNodeIds.includes(node.id);
      const next = exists
        ? effectiveSelectedNodeIds.filter(id => id !== node.id)
        : [...effectiveSelectedNodeIds, node.id];
      setEffectiveSelectedNodeIds(next);
      if (next.length === 1) onSelectNode(next[0]);
      else onSelectNode(null);
      return;
    }

    if (!effectiveSelectedNodeIds.includes(node.id)) {
      setEffectiveSelectedNodeIds([node.id]);
      onSelectNode(node.id);
    }

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    setDraggedEntity({
      type: 'node',
      id: node.id,
      offsetX: mouseX - node.x,
      offsetY: mouseY - node.y,
    });
  };

  const handleJammerMouseDown = (e: React.MouseEvent, jammer: JammingZone) => {
    e.stopPropagation();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    setDraggedEntity({
      type: 'jammer',
      id: jammer.id,
      offsetX: mouseX - jammer.x,
      offsetY: mouseY - jammer.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (selectionBox) {
      const currentX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const currentY = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
      setSelectionBox(prev => prev ? { ...prev, currentX, currentY } : null);

      const xMin = Math.min(selectionBox.startX, currentX);
      const xMax = Math.max(selectionBox.startX, currentX);
      const yMin = Math.min(selectionBox.startY, currentY);
      const yMax = Math.max(selectionBox.startY, currentY);

      if (Math.abs(xMax - xMin) > 6 || Math.abs(yMax - yMin) > 6) {
        const inside = nodes.filter(n => n.x >= xMin && n.x <= xMax && n.y >= yMin && n.y <= yMax).map(n => n.id);
        setEffectiveSelectedNodeIds(inside);
        if (inside.length === 1) {
          onSelectNode(inside[0]);
        } else if (inside.length > 1) {
          onSelectNode(null);
        }
      }
      return;
    }

    if (!draggedEntity) return;
    const newX = Math.max(30, Math.min(rect.width - 30, e.clientX - rect.left - draggedEntity.offsetX));
    const newY = Math.max(30, Math.min(rect.height - 30, e.clientY - rect.top - draggedEntity.offsetY));

    if (draggedEntity.type === 'node') {
      onUpdateNodePosition(draggedEntity.id, Math.round(newX), Math.round(newY));
    } else {
      onUpdateJammerPosition(draggedEntity.id, Math.round(newX), Math.round(newY));
    }
  };

  const handleMouseUp = () => {
    if (selectionBox) {
      const dist = Math.hypot(selectionBox.currentX - selectionBox.startX, selectionBox.currentY - selectionBox.startY);
      if (dist < 6) {
        setEffectiveSelectedNodeIds([]);
        onSelectNode(null);
      }
      setSelectionBox(null);
    }
    setDraggedEntity(null);
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  return (
    <div
      ref={containerRef}
      onMouseDown={handleContainerMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className="relative w-full h-[620px] bg-[#07090E] border border-[#1E293B] rounded-lg overflow-hidden select-none shadow-2xl cursor-crosshair"
    >
      {/* Background Coordinate Radar Grid */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
        <defs>
          <pattern id="tactical-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#334155" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#tactical-grid)" />
        {/* Radar Concentric Distance Rings */}
        <circle cx="500" cy="300" r="180" fill="none" stroke="#06B6D4" strokeWidth="0.5" strokeDasharray="4 4" />
        <circle cx="500" cy="300" r="340" fill="none" stroke="#06B6D4" strokeWidth="0.5" strokeDasharray="4 4" />
        <circle cx="500" cy="300" r="500" fill="none" stroke="#06B6D4" strokeWidth="0.5" strokeDasharray="6 6" />
        {/* Radar Azimuth Crosshairs */}
        <line x1="500" y1="0" x2="500" y2="620" stroke="#06B6D4" strokeWidth="0.5" strokeDasharray="2 4" />
        <line x1="0" y1="300" x2="1000" y2="300" stroke="#06B6D4" strokeWidth="0.5" strokeDasharray="2 4" />
      </svg>

      {/* Real-Time RF Spectrum Interference Heatmap Layer */}
      {showHeatmap && (
        <canvas
          ref={heatmapCanvasRef}
          width={1000}
          height={620}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />
      )}

      {/* Military MGRS Coordinate Watermark */}
      <div className="absolute top-3 left-4 text-[10px] font-mono text-slate-500 tracking-wider pointer-events-none">
        GRID REF: 38T NL 4821 9012 · THEATER: CENTCOM FORWARD · AD-HOC MESH: {activeProtocol}
      </div>

      {/* Interactive Canvas HUD Overlay Controls */}
      <div className="absolute top-3 right-4 flex items-center gap-2 z-20">
        <div className="flex items-center gap-1 bg-[#0F1420]/90 border border-slate-700/80 rounded px-2 py-1 text-xs">
          <span className="text-slate-400 font-mono text-[11px]">SPEED:</span>
          {[0.5, 1.0, 2.0].map(s => (
            <button
              key={s}
              onClick={(e) => { e.stopPropagation(); onChangeSpeed(s); }}
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                simulationSpeed === s ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); setShowHeatmap(!showHeatmap); }}
          className={`px-2 py-1 text-xs border rounded transition-colors ${
            showHeatmap ? 'bg-rose-950/70 border-rose-500/80 text-rose-300 font-semibold' : 'bg-slate-900 border-slate-700 text-slate-400'
          }`}
          title="Toggle RF Signal Interference Heatmap Layer"
        >
          RF Heatmap
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); setShowCoverageMap(!showCoverageMap); }}
          className={`flex items-center gap-1 px-2 py-1 text-xs border rounded transition-colors ${
            showCoverageMap ? 'bg-cyan-950/70 border-cyan-400 text-cyan-300 font-semibold' : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
          }`}
          title="Toggle Multi-Zone Radio-Frequency Coverage Map (Signal Strength Zones)"
        >
          <Radio className="w-3 h-3 text-cyan-400" />
          <span>RF Coverage</span>
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); setShowLinks(!showLinks); }}
          className={`px-2 py-1 text-xs border rounded transition-colors ${
            showLinks ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300' : 'bg-slate-900 border-slate-700 text-slate-400'
          }`}
          title="Toggle Link Signal Lines"
        >
          RF Links
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); setShowLinkPlot(!showLinkPlot); }}
          className={`flex items-center gap-1 px-2 py-1 text-xs border rounded transition-colors ${
            showLinkPlot ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300 font-semibold' : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
          }`}
          title="Toggle Real-Time D3 Link Quality Plot (SNR vs Distance)"
        >
          <Activity className="w-3 h-3 text-cyan-400" />
          <span>Link Plot (D3)</span>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            if (effectiveSelectedNodeIds.length === nodes.length) {
              setEffectiveSelectedNodeIds([]);
              onSelectNode(null);
            } else {
              setEffectiveSelectedNodeIds(nodes.map(n => n.id));
              onSelectNode(null);
            }
          }}
          className={`flex items-center gap-1 px-2 py-1 text-xs border rounded transition-colors ${
            effectiveSelectedNodeIds.length > 1 ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300 font-semibold' : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
          }`}
          title="Drag a box on canvas or click to select all nodes"
        >
          <MousePointer className="w-3 h-3 text-cyan-400" />
          <span>{effectiveSelectedNodeIds.length > 1 ? `Group (${effectiveSelectedNodeIds.length})` : 'Box Select'}</span>
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); onAddUavNode(); }}
          className="flex items-center gap-1 px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-slate-200 transition-colors"
          title="Deploy Extra Relay UAV"
        >
          <Plus className="w-3 h-3 text-cyan-400" />
          <span>Deploy UAV</span>
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); onAddJammer(); }}
          className="flex items-center gap-1 px-2.5 py-1 text-xs bg-rose-950/60 hover:bg-rose-900/60 border border-rose-700/60 rounded text-rose-300 transition-colors"
          title="Deploy Electronic Warfare Jamming Pod"
        >
          <Zap className="w-3 h-3 text-rose-400" />
          <span>Add EW Jammer</span>
        </button>
      </div>

      {/* SVG Layer: Links, Ranges, Jamming, and Animated Packets */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {/* RF Signal Propagation Radial Gradients */}
        <defs>
          <radialGradient id="uav-propagation-gradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.22" />
            <stop offset="35%" stopColor="#06B6D4" stopOpacity="0.12" />
            <stop offset="70%" stopColor="#06B6D4" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#06B6D4" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="ground-propagation-gradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.20" />
            <stop offset="35%" stopColor="#F59E0B" stopOpacity="0.10" />
            <stop offset="70%" stopColor="#F59E0B" stopOpacity="0.03" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="cp-propagation-gradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.22" />
            <stop offset="35%" stopColor="#10B981" stopOpacity="0.12" />
            <stop offset="70%" stopColor="#10B981" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="satcom-propagation-gradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#A855F7" stopOpacity="0.22" />
            <stop offset="35%" stopColor="#A855F7" stopOpacity="0.12" />
            <stop offset="70%" stopColor="#A855F7" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#A855F7" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 1. EW Jamming Zones (Red Contested Spectrum Circles) */}
        {jammingZones.map(jammer => {
          if (!jammer.active) return null;
          return (
            <g key={jammer.id}>
              {/* Outer Jamming Propagation Radius */}
              <circle
                cx={jammer.x}
                cy={jammer.y}
                r={jammer.radius}
                fill="rgba(239, 68, 68, 0.08)"
                stroke="#EF4444"
                strokeWidth="1.5"
                strokeDasharray="6 4"
                className="animate-pulse"
              />
              <circle
                cx={jammer.x}
                cy={jammer.y}
                r={jammer.radius * 0.5}
                fill="rgba(239, 68, 68, 0.12)"
                stroke="#EF4444"
                strokeWidth="0.8"
              />
              {/* Jamming Frequency Label */}
              <text
                x={jammer.x}
                y={jammer.y - jammer.radius - 6}
                textAnchor="middle"
                fill="#EF4444"
                fontSize="10"
                fontFamily="IBM Plex Mono"
                fontWeight="600"
              >
                EW CONTESTED RF ZONE [{jammer.powerDbm} dBm]
              </text>
            </g>
          );
        })}

        {/* 2. Real-Time Radio-Frequency Coverage Map (Signal Strength Zones) */}
        {showCoverageMap && (
          <g id="rf-coverage-map">
            {nodes.map(node => {
              const isSel = node.id === selectedNodeId;
              const R = node.rangeRadius;
              const z1R = R * 0.35; // Zone 1: High-Throughput (>= -65 dBm)
              const z2R = R * 0.70; // Zone 2: Tactical C2 & Voice (>= -85 dBm)
              const z3R = R * 1.00; // Zone 3: Handover / Fringe Boundary (-95 dBm)

              const baseColor = node.role === 'uav'
                ? '#06B6D4'
                : node.role === 'command_post'
                ? '#10B981'
                : node.role === 'satcom_relay'
                ? '#A855F7'
                : '#F59E0B';

              const gradientUrl = node.role === 'uav'
                ? 'url(#uav-propagation-gradient)'
                : node.role === 'command_post'
                ? 'url(#cp-propagation-gradient)'
                : node.role === 'satcom_relay'
                ? 'url(#satcom-propagation-gradient)'
                : 'url(#ground-propagation-gradient)';

              return (
                <g key={`coverage-${node.id}`}>
                  {/* Continuous Radial Propagation Envelopes */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={z3R}
                    fill={gradientUrl}
                    opacity={isSel ? 1.0 : 0.65}
                  />

                  {/* Zone 3: Fringe Limit (-95 dBm Handover Edge) */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={z3R}
                    fill="none"
                    stroke={baseColor}
                    strokeWidth={isSel ? 1.0 : 0.5}
                    strokeDasharray="6 4"
                    opacity={isSel ? 0.8 : 0.3}
                  />

                  {/* Zone 2: Tactical C2 & Voice (>= -85 dBm) */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={z2R}
                    fill={baseColor}
                    fillOpacity={isSel ? 0.08 : 0.04}
                    stroke={baseColor}
                    strokeWidth={isSel ? 1.2 : 0.75}
                    strokeDasharray="4 2"
                    opacity={isSel ? 0.9 : 0.45}
                  />

                  {/* Zone 1: High-Throughput QAM / HD Video (>= -65 dBm) */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={z1R}
                    fill={baseColor}
                    fillOpacity={isSel ? 0.16 : 0.08}
                    stroke={baseColor}
                    strokeWidth={isSel ? 1.8 : 1.1}
                    opacity={isSel ? 1.0 : 0.7}
                  />

                  {/* Directional Velocity Vector (Airborne Nodes) */}
                  {node.isMoving && (node.velocity.vx !== 0 || node.velocity.vy !== 0) && (
                    <line
                      x1={node.x}
                      y1={node.y}
                      x2={node.x + node.velocity.vx * 120}
                      y2={node.y + node.velocity.vy * 120}
                      stroke={baseColor}
                      strokeWidth={1.2}
                      strokeDasharray="2 2"
                      opacity={0.6}
                    />
                  )}

                  {/* Coverage Strength Annotation Labels for Selected Node */}
                  {isSel && (
                    <g>
                      <text
                        x={node.x}
                        y={node.y - z1R - 3}
                        fill={baseColor}
                        fontSize="8"
                        fontFamily="IBM Plex Mono"
                        fontWeight="600"
                        textAnchor="middle"
                      >
                        ZONE 1: ≥ -65 dBm (HIGH QAM / VIDEO)
                      </text>
                      <text
                        x={node.x}
                        y={node.y - z2R - 3}
                        fill={baseColor}
                        fontSize="8"
                        fontFamily="IBM Plex Mono"
                        textAnchor="middle"
                        opacity="0.8"
                      >
                        ZONE 2: ≥ -85 dBm (TACTICAL C2)
                      </text>
                      <text
                        x={node.x}
                        y={node.y - z3R - 3}
                        fill={baseColor}
                        fontSize="8"
                        fontFamily="IBM Plex Mono"
                        textAnchor="middle"
                        opacity="0.6"
                      >
                        ZONE 3: -95 dBm (SENSITIVITY HORIZON)
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        )}

        {/* 3. Operational and Jammed RF Wireless Links */}
        {showLinks &&
          links.map(link => {
            const nodeA = nodes.find(n => n.id === link.nodeAId);
            const nodeB = nodes.find(n => n.id === link.nodeBId);
            if (!nodeA || !nodeB) return null;

            if (link.isJammed) {
              // Severed / Jammed Link (Red Dashed)
              return (
                <g key={`link-${link.nodeAId}-${link.nodeBId}`}>
                  <line
                    x1={nodeA.x}
                    y1={nodeA.y}
                    x2={nodeB.x}
                    y2={nodeB.y}
                    stroke="#EF4444"
                    strokeWidth="1.2"
                    strokeDasharray="4 4"
                    opacity="0.6"
                  />
                  {/* Jammed Cross Marker */}
                  <text
                    x={(nodeA.x + nodeB.x) / 2}
                    y={(nodeA.y + nodeB.y) / 2}
                    fill="#EF4444"
                    fontSize="9"
                    fontFamily="IBM Plex Mono"
                    textAnchor="middle"
                  >
                    JAMMED
                  </text>
                </g>
              );
            }

            if (!link.isOperational) return null;

            // Operational Link: Color depends on SNR / TQ
            const strokeColor = link.tq > 180 ? '#06B6D4' : link.tq > 90 ? '#F59E0B' : '#64748B';
            const strokeWidth = link.tq > 180 ? 1.5 : 1.0;

            return (
              <g
                key={`link-${link.nodeAId}-${link.nodeBId}`}
                onClick={(e) => {
                  e.stopPropagation();
                  const pair = { nodeAId: link.nodeAId, nodeBId: link.nodeBId };
                  setInternalSelectedPair(pair);
                  onSelectLinkPair?.(link.nodeAId, link.nodeBId);
                  setShowLinkPlot(true);
                }}
                className="cursor-pointer pointer-events-auto group"
              >
                <title>{`Analyze link in D3 plot: ${nodeA.callsign} <-> ${nodeB.callsign}`}</title>
                <line
                  x1={nodeA.x}
                  y1={nodeA.y}
                  x2={nodeB.x}
                  y2={nodeB.y}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  opacity={selectedNodeId === nodeA.id || selectedNodeId === nodeB.id ? '1' : '0.6'}
                />
                {/* Midpoint metric indicator if selected */}
                {(selectedNodeId === nodeA.id || selectedNodeId === nodeB.id) && (
                  <text
                    x={(nodeA.x + nodeB.x) / 2}
                    y={(nodeA.y + nodeB.y) / 2 - 4}
                    fill={strokeColor}
                    fontSize="9"
                    fontFamily="IBM Plex Mono"
                    textAnchor="middle"
                  >
                    {activeProtocol === 'BATMAN_V'
                      ? `TQ:${link.tq}`
                      : activeProtocol === 'OLSR'
                      ? `ETX:${link.etx}`
                      : `${link.distanceM}m`}
                  </text>
                )}
              </g>
            );
          })}

        {/* 4. In-Flight Tactical Packet Particles */}
        {inFlightPackets.map(pkt => {
          const currentHop = nodes.find(n => n.id === pkt.path[pkt.currentPathIndex]);
          const nextHop = nodes.find(n => n.id === pkt.path[pkt.currentPathIndex + 1]);
          if (!currentHop || !nextHop) return null;

          const curX = currentHop.x + (nextHop.x - currentHop.x) * pkt.progress;
          const curY = currentHop.y + (nextHop.y - currentHop.y) * pkt.progress;

          const color = pkt.isReplayed
            ? '#F43F5E' // Replay injection (Rose)
            : pkt.isTampered
            ? '#EF4444' // Tampered (Red)
            : pkt.type === 'CCSDS_BUNDLE'
            ? '#F59E0B' // DTN Bundle (Amber)
            : pkt.type === 'NOISE_HANDSHAKE'
            ? '#A855F7' // Noise handshake (Purple)
            : '#06B6D4'; // STANAG C2 (Cyan)

          return (
            <g key={`pkt-${pkt.id}`}>
              {/* Outer Glow Halo */}
              <circle cx={curX} cy={curY} r="7" fill={color} opacity="0.3" />
              {/* Core Packet Dot */}
              <circle cx={curX} cy={curY} r="3.5" fill={color} />
              {/* Packet Label */}
              <text
                x={curX + 8}
                y={curY + 3}
                fill={color}
                fontSize="9"
                fontFamily="IBM Plex Mono"
                fontWeight="600"
              >
                {pkt.isReplayed ? 'REPLAY_PKT' : pkt.type === 'STANAG_C2' ? 'STANAG_4586' : 'CCSDS_DTN'}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Drag Selection Marquee Box */}
      {selectionBox && Math.hypot(selectionBox.currentX - selectionBox.startX, selectionBox.currentY - selectionBox.startY) > 5 && (
        <div
          style={{
            left: `${Math.min(selectionBox.startX, selectionBox.currentX)}px`,
            top: `${Math.min(selectionBox.startY, selectionBox.currentY)}px`,
            width: `${Math.abs(selectionBox.currentX - selectionBox.startX)}px`,
            height: `${Math.abs(selectionBox.currentY - selectionBox.startY)}px`,
          }}
          className="absolute border border-cyan-400 bg-cyan-500/15 pointer-events-none z-35 rounded-sm shadow-[0_0_12px_rgba(6,182,212,0.35)]"
        >
          <div className="absolute -top-5 left-0 px-1.5 py-0.5 bg-[#0B0F19] text-cyan-300 border border-cyan-500/80 rounded text-[9px] font-mono leading-none whitespace-nowrap">
            GROUP SELECT: {effectiveSelectedNodeIds.length} ASSET{effectiveSelectedNodeIds.length !== 1 ? 'S' : ''}
          </div>
        </div>
      )}

      {/* Floating Group Command Action Bar */}
      {effectiveSelectedNodeIds.length >= 2 && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-40 bg-[#0B0F19]/95 border border-cyan-500/80 rounded-lg p-2.5 shadow-2xl backdrop-blur-md flex flex-wrap items-center gap-3 font-mono text-xs select-none">
          <div className="flex items-center gap-2 border-r border-slate-700/80 pr-3">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <div>
              <div className="text-[10px] text-cyan-300 uppercase font-bold tracking-wider">
                GROUP SELECTED ({effectiveSelectedNodeIds.length} NODES)
              </div>
              <div className="text-[9px] text-slate-400 max-w-[200px] truncate">
                {effectiveSelectedNodeIds.map(id => nodes.find(n => n.id === id)?.callsign).filter(Boolean).join(', ')}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onBulkSyncSecurity?.(effectiveSelectedNodeIds)}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-600/80 text-emerald-300 rounded text-xs transition-colors font-medium"
              title="Bulk synchronize Noise Protocol XX mutual authentication and anti-replay windows"
            >
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Sync Security State</span>
            </button>

            <button
              onClick={() => onBulkReboot?.(effectiveSelectedNodeIds)}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-600/80 text-cyan-300 rounded text-xs transition-colors font-medium"
              title="Bulk reboot transceivers, flush routing tables, and re-converge mesh"
            >
              <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
              <span>Reboot Transceivers</span>
            </button>

            <button
              onClick={() => onBulkToggleMobility?.(effectiveSelectedNodeIds)}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded text-xs transition-colors"
              title="Bulk halt or resume patrol/orbit movement"
            >
              <Play className="w-3.5 h-3.5 text-amber-400" />
              <span>Toggle Patrol</span>
            </button>

            <button
              onClick={() => onBulkFlushDtn?.(effectiveSelectedNodeIds)}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-950/80 hover:bg-amber-900 border border-amber-600/80 text-amber-300 rounded text-xs transition-colors"
              title="Flush DTN custody queues across selected nodes"
            >
              <HardDrive className="w-3.5 h-3.5 text-amber-400" />
              <span>Flush DTN</span>
            </button>

            <button
              onClick={() => {
                setEffectiveSelectedNodeIds([]);
                onSelectNode(null);
              }}
              className="px-2 py-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors text-xs"
              title="Deselect all nodes"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Interactive Tactical Nodes HTML Overlay (Draggable) */}
      {nodes.map(node => {
        const isSelected = effectiveSelectedNodeIds.includes(node.id) || node.id === selectedNodeId;
        const isGroupSel = effectiveSelectedNodeIds.includes(node.id) && effectiveSelectedNodeIds.length > 1;

        return (
          <div
            key={node.id}
            onMouseDown={(e) => handleNodeMouseDown(e, node)}
            onClick={(e) => {
              e.stopPropagation();
              if (effectiveSelectedNodeIds.length <= 1) {
                setEffectiveSelectedNodeIds([node.id]);
                onSelectNode(node.id);
              }
            }}
            style={{ left: `${node.x}px`, top: `${node.y}px` }}
            className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing z-30 group transition-transform ${
              isSelected ? 'scale-110' : 'hover:scale-105'
            }`}
          >
            {/* Group Selected Badge */}
            {isGroupSel && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-1 py-0.2 bg-cyan-400 text-slate-950 text-[8px] font-bold font-mono rounded-sm leading-none tracking-wider shadow">
                GROUP
              </div>
            )}

            {/* Node Icon Box */}
            <div
              className={`relative flex items-center justify-center w-10 h-10 rounded-lg border transition-all ${
                isGroupSel
                  ? 'bg-cyan-950 border-cyan-400 text-cyan-200 ring-2 ring-cyan-400 ring-offset-2 ring-offset-[#07090E] shadow-[0_0_20px_rgba(6,182,212,0.6)]'
                  : isSelected
                  ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                  : node.role === 'uav'
                  ? 'bg-slate-900/90 border-slate-700 text-cyan-400 hover:border-cyan-500'
                  : node.role === 'command_post'
                  ? 'bg-slate-900/90 border-slate-700 text-emerald-400 hover:border-emerald-500'
                  : node.role === 'satcom_relay'
                  ? 'bg-slate-900/90 border-slate-700 text-purple-400 hover:border-purple-500'
                  : 'bg-slate-900/90 border-slate-700 text-amber-400 hover:border-amber-500'
              }`}
            >
              {node.role === 'uav' && <Radio className="w-5 h-5" />}
              {node.role === 'ground_patrol' && <Shield className="w-5 h-5" />}
              {node.role === 'command_post' && <Crosshair className="w-5 h-5" />}
              {node.role === 'satcom_relay' && <Zap className="w-5 h-5" />}

              {/* DTN Queue Badge if holding custody bundles */}
              {node.dtnCustodyQueue.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-4 h-4 text-[9px] font-bold font-mono bg-amber-500 text-slate-950 rounded-full shadow">
                  {node.dtnCustodyQueue.length}
                </span>
              )}
            </div>

            {/* Tactical Callsign & Status Pill */}
            <div className="absolute top-11 left-1/2 -translate-x-1/2 whitespace-nowrap text-center pointer-events-none">
              <div className="text-[11px] font-mono font-bold text-slate-200 tracking-wide bg-slate-950/80 px-1.5 py-0.5 rounded border border-slate-800">
                {node.callsign}
              </div>
              <div className="text-[9px] font-mono text-slate-400 mt-0.5">
                {node.role === 'uav' ? `${node.altitudeM}m ALT` : `${node.batteryPct}% BAT`}
              </div>
            </div>
          </div>
        );
      })}

      {/* Interactive EW Jamming Pods (Draggable & Toggleable) */}
      {jammingZones.map(jammer => (
        <div
          key={jammer.id}
          onMouseDown={(e) => handleJammerMouseDown(e, jammer)}
          onClick={(e) => { e.stopPropagation(); onToggleJammer(jammer.id); }}
          style={{ left: `${jammer.x}px`, top: `${jammer.y}px` }}
          className="absolute -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing z-25 group"
          title={`Click to ${jammer.active ? 'Disable' : 'Enable'} Jamming Pod`}
        >
          <div
            className={`flex items-center justify-center w-9 h-9 rounded-full border transition-all ${
              jammer.active
                ? 'bg-rose-950/90 border-rose-500 text-rose-300 shadow-[0_0_20px_rgba(239,68,68,0.5)]'
                : 'bg-slate-900/80 border-slate-700 text-slate-500 opacity-60'
            }`}
          >
            {jammer.active ? <Volume2 className="w-4 h-4 text-rose-400" /> : <VolumeX className="w-4 h-4" />}
          </div>
          <div className="absolute top-10 left-1/2 -translate-x-1/2 whitespace-nowrap text-center pointer-events-none">
            <span
              className={`text-[9px] font-mono px-1 py-0.5 rounded border ${
                jammer.active
                  ? 'bg-rose-950/80 border-rose-700 text-rose-300'
                  : 'bg-slate-950/80 border-slate-800 text-slate-500'
              }`}
            >
              {jammer.callsign} ({jammer.active ? 'ACTIVE' : 'OFF'})
            </span>
          </div>
        </div>
      ))}

      {/* Bottom Floating Legend Bar */}
      <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-[11px] font-mono text-slate-400 bg-[#0A0E17]/90 border border-slate-800 px-3 py-1.5 rounded pointer-events-auto">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full border border-cyan-400 bg-cyan-400/30 inline-block" />
            <span>Zone 1 (≥ -65 dBm)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full border border-dashed border-cyan-400 inline-block" />
            <span>Zone 2 (≥ -85 dBm)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full border border-dotted border-slate-500 inline-block" />
            <span>Zone 3 (-95 dBm)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-rose-500 border-b border-dashed inline-block" />
            <span>EW Jammed</span>
          </div>
        </div>

        <div className="text-slate-500">
          Tip: Click any link line or toggle "Link Plot (D3)" to inspect real-time SNR vs Distance.
        </div>
      </div>

      {/* Real-Time D3 Link Quality Plot Floating HUD */}
      {showLinkPlot && (
        <div className="absolute bottom-12 right-4 z-40 max-w-[calc(100%-2rem)]">
          <LinkQualityPlot
            nodes={nodes}
            links={links}
            selectedNodeId={selectedNodeId}
            selectedPair={selectedLinkPair || internalSelectedPair}
            onSelectPair={(a, b) => {
              const pair = { nodeAId: a, nodeBId: b };
              setInternalSelectedPair(pair);
              onSelectLinkPair?.(a, b);
            }}
            onClose={() => setShowLinkPlot(false)}
          />
        </div>
      )}
    </div>
  );
};
