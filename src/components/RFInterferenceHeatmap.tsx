/**
 * RF Signal Interference Heatmap Component
 * Visualizes spatial electromagnetic spectrum degradation and Jamming-to-Signal (J/S) density
 * across tactical sectors.
 */

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { TacticalNode, JammingZone, RFLink } from '../types/protocol';
import {
  Zap,
  Radio,
  Sliders,
  Eye,
  Crosshair,
  Layers,
  AlertTriangle,
  Activity,
  Info,
} from 'lucide-react';

interface RFInterferenceHeatmapProps {
  nodes: TacticalNode[];
  jammingZones: JammingZone[];
  links: RFLink[];
  width?: number;
  height?: number;
  onUpdateJammerPower?: (jammerId: string, powerDbm: number) => void;
  onUpdateJammerRadius?: (jammerId: string, radius: number) => void;
  standalone?: boolean;
}

export const RFInterferenceHeatmap: React.FC<RFInterferenceHeatmapProps> = ({
  nodes,
  jammingZones,
  links,
  width = 1000,
  height = 620,
  onUpdateJammerPower,
  onUpdateJammerRadius,
  standalone = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [heatmapMode, setHeatmapMode] = useState<'INTERFERENCE' | 'SINR' | 'PDR_DEGRADATION'>('INTERFERENCE');
  const [showContours, setShowContours] = useState<boolean>(true);
  const [showSectorGrid, setShowSectorGrid] = useState<boolean>(true);
  const [opacity, setOpacity] = useState<number>(0.65);
  const [probePos, setProbePos] = useState<{ x: number; y: number } | null>(null);
  const [selectedJammerId, setSelectedJammerId] = useState<string>(jammingZones[0]?.id || '');

  // Calculate sector metrics (4 tactical sectors: NW, NE, SW, SE)
  const sectorMetrics = useMemo(() => {
    const sectors = [
      { id: 'SEC-ALPHA', name: 'Sector Alpha (NW)', x0: 0, y0: 0, x1: width / 2, y1: height / 2 },
      { id: 'SEC-BRAVO', name: 'Sector Bravo (NE)', x0: width / 2, y0: 0, x1: width, y1: height / 2 },
      { id: 'SEC-CHARLIE', name: 'Sector Charlie (SW)', x0: 0, y0: height / 2, x1: width / 2, y1: height },
      { id: 'SEC-DELTA', name: 'Sector Delta (SE)', x0: width / 2, y0: height / 2, x1: width, y1: height },
    ];

    return sectors.map(sec => {
      // Find jammers in or overlapping sector
      const overlappingJammers = jammingZones.filter(j => {
        if (!j.active) return false;
        return j.x + j.radius > sec.x0 && j.x - j.radius < sec.x1 &&
               j.y + j.radius > sec.y0 && j.y - j.radius < sec.y1;
      });

      // Find nodes in sector
      const nodesInSec = nodes.filter(n => n.x >= sec.x0 && n.x < sec.x1 && n.y >= sec.y0 && n.y < sec.y1);

      // Find links in sector
      const linksInSec = links.filter(l => {
        const nA = nodes.find(n => n.id === l.nodeAId);
        const nB = nodes.find(n => n.id === l.nodeBId);
        if (!nA || !nB) return false;
        const midX = (nA.x + nB.x) / 2;
        const midY = (nA.y + nB.y) / 2;
        return midX >= sec.x0 && midX < sec.x1 && midY >= sec.y0 && midY < sec.y1;
      });

      const jammedLinks = linksInSec.filter(l => l.isJammed).length;
      const degradationPct = linksInSec.length > 0 ? Math.round((jammedLinks / linksInSec.length) * 100) : 0;
      const maxJamPower = overlappingJammers.length > 0 ? Math.max(...overlappingJammers.map(j => j.powerDbm)) : 0;

      return {
        ...sec,
        activeJammersCount: overlappingJammers.length,
        nodesCount: nodesInSec.length,
        linksCount: linksInSec.length,
        jammedLinksCount: jammedLinks,
        degradationPct,
        maxJamPower,
        status: degradationPct > 50 ? 'CONTESTED_DENIAL' : degradationPct > 0 ? 'DEGRADED' : 'CLEAR',
      };
    });
  }, [nodes, jammingZones, links, width, height]);

  // Real-time canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    // Compute grid of 60 x 38 points
    const step = 16;
    const cols = Math.ceil(width / step);
    const rows = Math.ceil(height / step);

    const activeJammers = jammingZones.filter(j => j.active);

    // If no active jammers and not in SINR mode, render subtle ambient
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const px = c * step;
        const py = r * step;

        let totalJammerPowerMw = 0;

        for (const jammer of activeJammers) {
          const dx = px - jammer.x;
          const dy = py - jammer.y;
          const distPx = Math.sqrt(dx * dx + dy * dy);
          const distM = Math.max(8, distPx * 12.5); // 1px = 12.5m

          // Free-space path loss formula
          const pathLossDb = 20 * Math.log10(distM) + 20 * Math.log10(2400) - 27.55;
          const rxDbm = jammer.powerDbm - pathLossDb;
          const rxMw = Math.pow(10, rxDbm / 10);
          totalJammerPowerMw += rxMw;
        }

        const totalJamDbm = totalJammerPowerMw > 0 ? 10 * Math.log10(totalJammerPowerMw) : -120;

        // Find nearest friendly node for SNR calculation
        let maxNodeRxDbm = -120;
        for (const node of nodes) {
          const dx = px - node.x;
          const dy = py - node.y;
          const distPx = Math.sqrt(dx * dx + dy * dy);
          const distM = Math.max(8, distPx * 12.5);
          const pathLossDb = 20 * Math.log10(distM) + 20 * Math.log10(2400) - 27.55;
          const rxDbm = node.txPowerDbm - pathLossDb;
          if (rxDbm > maxNodeRxDbm) {
            maxNodeRxDbm = rxDbm;
          }
        }

        const sinrDb = maxNodeRxDbm - Math.max(-105, totalJamDbm);

        // Color computation depending on selected mode
        let rVal = 0, gVal = 0, bVal = 0, aVal = 0;

        if (heatmapMode === 'INTERFERENCE') {
          // Heatmap from clean (-100 dBm) to moderate (-75 dBm) to heavy (-45 dBm) to dense (>-35 dBm)
          if (totalJamDbm < -95) {
            aVal = 0; // Transparent
          } else if (totalJamDbm < -80) {
            // Faint amber/cyan border
            rVal = 6; gVal = 182; bVal = 212;
            aVal = 0.15 * opacity;
          } else if (totalJamDbm < -65) {
            // Moderate warning amber
            rVal = 245; gVal = 158; bVal = 11;
            aVal = 0.45 * opacity;
          } else if (totalJamDbm < -45) {
            // Severe interference (Red/Rose)
            rVal = 239; gVal = 68; bVal = 68;
            aVal = 0.75 * opacity;
          } else {
            // Complete RF denial (White hot magenta/red)
            rVal = 255; gVal = 100; bVal = 150;
            aVal = 0.92 * opacity;
          }
        } else if (heatmapMode === 'SINR') {
          // SINR Heatmap: Green (high SINR > 20dB) to Cyan to Orange to Red (<0 dB)
          if (sinrDb > 18) {
            rVal = 16; gVal = 185; bVal = 129;
            aVal = 0.3 * opacity;
          } else if (sinrDb > 8) {
            rVal = 6; gVal = 182; bVal = 212;
            aVal = 0.35 * opacity;
          } else if (sinrDb > 0) {
            rVal = 245; gVal = 158; bVal = 11;
            aVal = 0.55 * opacity;
          } else {
            rVal = 239; gVal = 68; bVal = 68;
            aVal = 0.8 * opacity;
          }
        } else {
          // PDR Degradation: Probability of loss
          const lossProb = totalJamDbm > -60 ? 1.0 : totalJamDbm > -80 ? 0.6 : 0.05;
          rVal = 239; gVal = Math.round(68 * (1 - lossProb)); bVal = 68;
          aVal = lossProb * 0.75 * opacity;
        }

        if (aVal > 0) {
          ctx.fillStyle = `rgba(${rVal}, ${gVal}, ${bVal}, ${aVal})`;
          ctx.fillRect(px, py, step, step);
        }
      }
    }

    // Draw Iso-Power Contour Threshold Circles
    if (showContours) {
      for (const jammer of activeJammers) {
        ctx.save();
        // Complete Denial Contour (-50 dBm threshold)
        ctx.beginPath();
        ctx.arc(jammer.x, jammer.y, jammer.radius * 0.65, 0, Math.PI * 2);
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 4]);
        ctx.stroke();

        // Degradation Contour (-75 dBm threshold)
        ctx.beginPath();
        ctx.arc(jammer.x, jammer.y, jammer.radius, 0, Math.PI * 2);
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 0.8;
        ctx.setLineDash([2, 4]);
        ctx.stroke();
        ctx.restore();
      }
    }

    // Draw Sector Crosshairs
    if (showSectorGrid) {
      ctx.save();
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(width / 2, 0);
      ctx.lineTo(width / 2, height);
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      ctx.restore();
    }
  }, [nodes, jammingZones, width, height, heatmapMode, showContours, showSectorGrid, opacity]);

  // Compute Probe Reading under cursor
  const probeReading = useMemo(() => {
    if (!probePos) return null;
    let totalJamMw = 0;
    for (const j of jammingZones) {
      if (!j.active) continue;
      const dPx = Math.sqrt((probePos.x - j.x) ** 2 + (probePos.y - j.y) ** 2);
      const dM = Math.max(8, dPx * 12.5);
      const pl = 20 * Math.log10(dM) + 20 * Math.log10(2400) - 27.55;
      const rxDbm = j.powerDbm - pl;
      totalJamMw += Math.pow(10, rxDbm / 10);
    }
    const jamDbm = totalJamMw > 0 ? Number((10 * Math.log10(totalJamMw)).toFixed(1)) : -120;

    let maxNodeDbm = -120;
    for (const n of nodes) {
      const dPx = Math.sqrt((probePos.x - n.x) ** 2 + (probePos.y - n.y) ** 2);
      const dM = Math.max(8, dPx * 12.5);
      const pl = 20 * Math.log10(dM) + 20 * Math.log10(2400) - 27.55;
      const rxDbm = n.txPowerDbm - pl;
      if (rxDbm > maxNodeDbm) maxNodeDbm = rxDbm;
    }
    const sinr = Number((maxNodeDbm - Math.max(-105, jamDbm)).toFixed(1));
    const packetLossPct = jamDbm > -55 ? 100 : jamDbm > -70 ? 75 : jamDbm > -85 ? 20 : 1;

    return {
      x: probePos.x,
      y: probePos.y,
      jamDbm,
      sinr,
      packetLossPct,
    };
  }, [probePos, jammingZones, nodes]);

  const selectedJammer = jammingZones.find(j => j.id === selectedJammerId) || jammingZones[0];

  return (
    <div className="space-y-4 font-mono text-xs text-slate-200">
      {/* Standalone Control Ribbon & Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#0B0F19] border border-[#1E293B] rounded-lg">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-100 font-bold font-sans">
            <Zap className="w-4 h-4 text-rose-400" />
            <span>RF Spectrum Interference Heatmap</span>
          </div>

          {/* Mode Selector */}
          <div className="flex items-center gap-1 p-0.5 bg-slate-900 border border-slate-700/80 rounded">
            <button
              onClick={() => setHeatmapMode('INTERFERENCE')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-colors ${
                heatmapMode === 'INTERFERENCE' ? 'bg-rose-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Jamming Power (dBm)
            </button>
            <button
              onClick={() => setHeatmapMode('SINR')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-colors ${
                heatmapMode === 'SINR' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              SINR (dB)
            </button>
            <button
              onClick={() => setHeatmapMode('PDR_DEGRADATION')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-colors ${
                heatmapMode === 'PDR_DEGRADATION' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Link Loss %
            </button>
          </div>
        </div>

        {/* Display Toggles & Opacity Slider */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-500 uppercase">Opacity:</span>
            <input
              type="range"
              min="0.2"
              max="1"
              step="0.05"
              value={opacity}
              onChange={(e) => setOpacity(parseFloat(e.target.value))}
              className="w-20 accent-rose-500 cursor-pointer"
            />
            <span className="text-[10px] text-slate-400 w-8 tabular-nums">{Math.round(opacity * 100)}%</span>
          </div>

          <button
            onClick={() => setShowContours(!showContours)}
            className={`px-2 py-1 text-[10px] border rounded transition-colors ${
              showContours ? 'bg-rose-950/70 border-rose-600 text-rose-300' : 'bg-slate-900 border-slate-700 text-slate-500'
            }`}
          >
            Iso-Contours
          </button>

          <button
            onClick={() => setShowSectorGrid(!showSectorGrid)}
            className={`px-2 py-1 text-[10px] border rounded transition-colors ${
              showSectorGrid ? 'bg-cyan-950/70 border-cyan-600 text-cyan-300' : 'bg-slate-900 border-slate-700 text-slate-500'
            }`}
          >
            Sectors
          </button>
        </div>
      </div>

      {/* Heatmap Canvas Container */}
      <div
        className="relative bg-[#07090E] border border-[#1E293B] rounded-lg overflow-hidden cursor-crosshair shadow-xl"
        style={{ width: '100%', height: `${height}px` }}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const scaleX = width / rect.width;
          const scaleY = height / rect.height;
          setProbePos({
            x: Math.round((e.clientX - rect.left) * scaleX),
            y: Math.round((e.clientY - rect.top) * scaleY),
          });
        }}
        onMouseLeave={() => setProbePos(null)}
      >
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />

        {/* Sector Labels Overlay */}
        {showSectorGrid && (
          <div className="absolute inset-0 pointer-events-none grid grid-cols-2 grid-rows-2 p-3 text-[10px] font-mono text-slate-500">
            <div className="flex items-start justify-between">
              <span className="bg-slate-950/80 px-1.5 py-0.5 rounded border border-slate-800">SEC-ALPHA [NW]</span>
            </div>
            <div className="flex items-start justify-end">
              <span className="bg-slate-950/80 px-1.5 py-0.5 rounded border border-slate-800">SEC-BRAVO [NE]</span>
            </div>
            <div className="flex items-end justify-between">
              <span className="bg-slate-950/80 px-1.5 py-0.5 rounded border border-slate-800">SEC-CHARLIE [SW]</span>
            </div>
            <div className="flex items-end justify-end">
              <span className="bg-slate-950/80 px-1.5 py-0.5 rounded border border-slate-800">SEC-DELTA [SE]</span>
            </div>
          </div>
        )}

        {/* Interactive Probe Crosshair HUD */}
        {probeReading && (
          <div
            style={{
              left: `${Math.min(width - 190, probeReading.x + 15)}px`,
              top: `${Math.min(height - 110, probeReading.y + 15)}px`,
            }}
            className="absolute pointer-events-none bg-slate-950/95 border border-cyan-500/80 text-[10px] font-mono p-2 rounded shadow-2xl space-y-1 z-30"
          >
            <div className="text-cyan-300 font-bold border-b border-slate-800 pb-0.5 flex items-center justify-between">
              <span>RF PROBE POINT</span>
              <span>[{probeReading.x}, {probeReading.y}]</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">Jamming Power:</span>
              <span className={`font-bold tabular-nums ${probeReading.jamDbm > -60 ? 'text-rose-400' : 'text-slate-200'}`}>
                {probeReading.jamDbm} dBm
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">Estimated SINR:</span>
              <span className={`font-bold tabular-nums ${probeReading.sinr > 10 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {probeReading.sinr} dB
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">Packet Loss Prob:</span>
              <span className={`font-bold tabular-nums ${probeReading.packetLossPct > 50 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {probeReading.packetLossPct}%
              </span>
            </div>
          </div>
        )}

        {/* Bottom Color Ramp Spectrum Legend */}
        <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-[10px] font-mono bg-slate-950/90 border border-slate-800 px-3 py-1.5 rounded pointer-events-auto">
          <div className="flex items-center gap-3">
            <span className="text-slate-400 uppercase">Spectrum Power Density:</span>
            <div className="flex items-center gap-1">
              <span className="w-3 h-2.5 rounded-sm bg-[#06B6D4] inline-block" />
              <span className="text-slate-300">&lt; -85 dBm (Nominal)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-2.5 rounded-sm bg-[#F59E0B] inline-block" />
              <span className="text-amber-300">-70 dBm (Degraded)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-2.5 rounded-sm bg-[#EF4444] inline-block" />
              <span className="text-rose-400">-50 dBm (Hostile Denial)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-2.5 rounded-sm bg-[#FF6496] inline-block" />
              <span className="text-pink-300">&gt; -40 dBm (SDR Saturation)</span>
            </div>
          </div>
          <div className="text-slate-500">
            Hover over canvas to probe point-to-point SINR
          </div>
        </div>
      </div>

      {/* Sector Tactical Analysis Strip & Active Jammer Tuning */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
        {sectorMetrics.map(sec => (
          <div
            key={sec.id}
            className={`p-3 rounded border space-y-1.5 ${
              sec.status === 'CONTESTED_DENIAL'
                ? 'bg-rose-950/20 border-rose-800/60'
                : sec.status === 'DEGRADED'
                ? 'bg-amber-950/20 border-amber-800/60'
                : 'bg-[#0B0F19] border-[#1E293B]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 text-xs">{sec.name}</span>
              <span
                className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                  sec.status === 'CONTESTED_DENIAL'
                    ? 'bg-rose-950 text-rose-300 border-rose-700'
                    : sec.status === 'DEGRADED'
                    ? 'bg-amber-950 text-amber-300 border-amber-700'
                    : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                }`}
              >
                {sec.status.replace('_', ' ')}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 pt-1">
              <div>
                <span>Degradation:</span>
                <span className={`ml-1 font-bold ${sec.degradationPct > 40 ? 'text-rose-400' : 'text-slate-200'}`}>
                  {sec.degradationPct}%
                </span>
              </div>
              <div>
                <span>Jammed Links:</span>
                <span className="ml-1 font-bold text-slate-200">
                  {sec.jammedLinksCount} / {sec.linksCount}
                </span>
              </div>
              <div>
                <span>Active Jammers:</span>
                <span className="ml-1 font-bold text-slate-200">{sec.activeJammersCount}</span>
              </div>
              <div>
                <span>Max Power:</span>
                <span className="ml-1 font-bold text-slate-200">{sec.maxJamPower > 0 ? `${sec.maxJamPower} dBm` : '0 dBm'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Jammer Tuning Scrubber (Allows live parameter adjustments) */}
      {selectedJammer && onUpdateJammerPower && onUpdateJammerRadius && (
        <div className="p-3 bg-[#0B0F19] border border-[#1E293B] rounded-lg space-y-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span className="font-bold text-slate-100 text-xs font-sans">
                Electronic Warfare Parameter Calibrator: {selectedJammer.callsign}
              </span>
            </div>
            <select
              value={selectedJammer.id}
              onChange={(e) => setSelectedJammerId(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs font-mono"
            >
              {jammingZones.map(j => (
                <option key={j.id} value={j.id}>{j.callsign} ({j.active ? 'ACTIVE' : 'OFF'})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span>Jamming Power (ERP):</span>
                <span className="text-rose-400 font-bold tabular-nums">{selectedJammer.powerDbm} dBm ({(Math.pow(10, selectedJammer.powerDbm / 10) / 1000).toFixed(1)}W)</span>
              </div>
              <input
                type="range"
                min="20"
                max="55"
                step="1"
                value={selectedJammer.powerDbm}
                onChange={(e) => onUpdateJammerPower(selectedJammer.id, parseInt(e.target.value))}
                className="w-full accent-rose-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span>Interference Radius:</span>
                <span className="text-amber-400 font-bold tabular-nums">{selectedJammer.radius} px ({Math.round(selectedJammer.radius * 12.5)}m)</span>
              </div>
              <input
                type="range"
                min="60"
                max="260"
                step="5"
                value={selectedJammer.radius}
                onChange={(e) => onUpdateJammerRadius(selectedJammer.id, parseInt(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
