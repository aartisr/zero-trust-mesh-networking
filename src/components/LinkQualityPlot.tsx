/**
 * D3-Based Real-Time Link Quality Plot: SNR (dB) vs Distance (m)
 * Dynamically tracks theoretical path loss vs live empirical measurements across moving nodes.
 */

import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { TacticalNode, RFLink } from '../types/protocol';
import {
  Activity,
  Maximize2,
  Minimize2,
  X,
  Radio,
  Sliders,
  TrendingDown,
  Info,
} from 'lucide-react';

interface LinkQualityPlotProps {
  nodes: TacticalNode[];
  links: RFLink[];
  selectedNodeId: string | null;
  selectedPair: { nodeAId: string; nodeBId: string } | null;
  onSelectPair: (nodeAId: string, nodeBId: string) => void;
  onClose?: () => void;
}

interface HistoricalPoint {
  distanceM: number;
  snrDb: number;
  isJammed: boolean;
  tq: number;
  timestamp: number;
}

export const LinkQualityPlot: React.FC<LinkQualityPlotProps> = ({
  nodes,
  links,
  selectedNodeId,
  selectedPair,
  onSelectPair,
  onClose,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [history, setHistory] = useState<HistoricalPoint[]>([]);

  // Default to first active link or selected pair
  const activePair = useMemo(() => {
    if (selectedPair) return selectedPair;
    if (selectedNodeId) {
      const adjacentLink = links.find(l => l.nodeAId === selectedNodeId || l.nodeBId === selectedNodeId);
      if (adjacentLink) {
        return { nodeAId: adjacentLink.nodeAId, nodeBId: adjacentLink.nodeBId };
      }
    }
    const firstOpLink = links.find(l => l.isOperational) || links[0];
    if (firstOpLink) {
      return { nodeAId: firstOpLink.nodeAId, nodeBId: firstOpLink.nodeBId };
    }
    if (nodes.length >= 2) {
      return { nodeAId: nodes[0].id, nodeBId: nodes[1].id };
    }
    return null;
  }, [selectedPair, selectedNodeId, links, nodes]);

  // Find active link data
  const currentLink = useMemo(() => {
    if (!activePair) return null;
    return links.find(
      l => (l.nodeAId === activePair.nodeAId && l.nodeBId === activePair.nodeBId) ||
           (l.nodeAId === activePair.nodeBId && l.nodeBId === activePair.nodeAId)
    );
  }, [activePair, links]);

  const nodeA = nodes.find(n => n.id === activePair?.nodeAId);
  const nodeB = nodes.find(n => n.id === activePair?.nodeBId);

  // Record historical points as nodes move
  useEffect(() => {
    if (!currentLink) return;
    setHistory(prev => {
      const now = Date.now();
      // Keep up to 40 historical points for trail
      const newPt: HistoricalPoint = {
        distanceM: currentLink.distanceM,
        snrDb: currentLink.snrDb,
        isJammed: currentLink.isJammed,
        tq: currentLink.tq,
        timestamp: now,
      };
      const filtered = prev.filter(p => now - p.timestamp < 12000);
      return [...filtered, newPt];
    });
  }, [currentLink?.distanceM, currentLink?.snrDb, currentLink?.isJammed, currentLink?.tq]);

  // Reset history if pair changes
  useEffect(() => {
    setHistory([]);
  }, [activePair?.nodeAId, activePair?.nodeBId]);

  // D3 Render Loop
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = isExpanded ? 720 : 440;
    const height = isExpanded ? 340 : 220;
    const margin = { top: 25, right: 30, bottom: 35, left: 45 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // D3 Scales
    const xScale = d3.scaleLinear()
      .domain([0, 5000]) // Distance in meters (up to 5 km)
      .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
      .domain([-20, 45]) // SNR in dB
      .range([innerHeight, 0]);

    // 1. Shaded Threshold Zones
    // Complete Denial Zone (SNR < 0 dB)
    g.append('rect')
      .attr('x', 0)
      .attr('y', yScale(0))
      .attr('width', innerWidth)
      .attr('height', innerHeight - yScale(0))
      .attr('fill', 'rgba(239, 68, 68, 0.08)');

    // Marginal Zone (0 dB <= SNR < 8 dB)
    g.append('rect')
      .attr('x', 0)
      .attr('y', yScale(8))
      .attr('width', innerWidth)
      .attr('height', yScale(0) - yScale(8))
      .attr('fill', 'rgba(245, 158, 11, 0.08)');

    // Nominal Zone (8 dB <= SNR < 25 dB)
    g.append('rect')
      .attr('x', 0)
      .attr('y', yScale(25))
      .attr('width', innerWidth)
      .attr('height', yScale(8) - yScale(25))
      .attr('fill', 'rgba(6, 182, 212, 0.05)');

    // High QAM Optimal Zone (SNR >= 25 dB)
    g.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', innerWidth)
      .attr('height', yScale(25))
      .attr('fill', 'rgba(16, 185, 129, 0.05)');

    // 2. Subtle Gridlines
    const xGrid = d3.axisBottom(xScale)
      .ticks(5)
      .tickSize(-innerHeight)
      .tickFormat(() => '');

    const yGrid = d3.axisLeft(yScale)
      .ticks(6)
      .tickSize(-innerWidth)
      .tickFormat(() => '');

    g.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xGrid)
      .selectAll('line')
      .attr('stroke', '#1E293B')
      .attr('stroke-width', 0.5)
      .attr('stroke-dasharray', '2 2');

    g.append('g')
      .attr('class', 'grid')
      .call(yGrid)
      .selectAll('line')
      .attr('stroke', '#1E293B')
      .attr('stroke-width', 0.5)
      .attr('stroke-dasharray', '2 2');

    // 3. Theoretical Free-Space Path Loss Reference Curve (FSPL at 2.4 GHz)
    const theoreticalData: Array<[number, number]> = [];
    const txPwr = nodeA ? nodeA.txPowerDbm : 30;
    const noiseFloor = -105;
    for (let d = 50; d <= 5000; d += 50) {
      const pl = 20 * Math.log10(d) + 20 * Math.log10(2400) - 27.55;
      const rx = txPwr - pl;
      const snr = Math.max(-20, Math.min(45, rx - noiseFloor));
      theoreticalData.push([d, snr]);
    }

    const lineGen = d3.line<[number, number]>()
      .x(d => xScale(d[0]))
      .y(d => yScale(d[1]))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(theoreticalData)
      .attr('fill', 'none')
      .attr('stroke', '#64748B')
      .attr('stroke-width', 1.2)
      .attr('stroke-dasharray', '4 3')
      .attr('opacity', 0.6);

    // Label Theoretical Curve
    g.append('text')
      .attr('x', innerWidth - 5)
      .attr('y', yScale(theoreticalData[theoreticalData.length - 1][1]) - 6)
      .attr('text-anchor', 'end')
      .attr('fill', '#64748B')
      .attr('font-size', '9px')
      .attr('font-family', 'IBM Plex Mono')
      .text('Theoretical FSPL');

    // 4. Threshold Boundary Lines (8 dB sensitivity cutoff & 0 dB jam cutoff)
    g.append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', yScale(8))
      .attr('y2', yScale(8))
      .attr('stroke', '#F59E0B')
      .attr('stroke-width', 0.8)
      .attr('stroke-dasharray', '3 3');

    g.append('text')
      .attr('x', 6)
      .attr('y', yScale(8) - 3)
      .attr('fill', '#F59E0B')
      .attr('font-size', '8px')
      .attr('font-family', 'IBM Plex Mono')
      .text('8 dB Sensitivity Threshold');

    g.append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', yScale(0))
      .attr('y2', yScale(0))
      .attr('stroke', '#EF4444')
      .attr('stroke-width', 0.8);

    g.append('text')
      .attr('x', 6)
      .attr('y', yScale(0) - 3)
      .attr('fill', '#EF4444')
      .attr('font-size', '8px')
      .attr('font-family', 'IBM Plex Mono')
      .text('0 dB Jamming Threshold');

    // 5. All Active Mesh Links as Context Scatter Points
    for (const l of links) {
      const isSelected = activePair &&
        ((l.nodeAId === activePair.nodeAId && l.nodeBId === activePair.nodeBId) ||
         (l.nodeAId === activePair.nodeBId && l.nodeBId === activePair.nodeAId));
      if (isSelected) continue; // Drawn separately

      g.append('circle')
        .attr('cx', xScale(l.distanceM))
        .attr('cy', yScale(l.snrDb))
        .attr('r', 3)
        .attr('fill', l.isJammed ? '#EF4444' : l.isOperational ? '#06B6D4' : '#64748B')
        .attr('opacity', 0.4);
    }

    // 6. Historical Motion Trail for Active Pair
    if (history.length > 1) {
      const trailGen = d3.line<HistoricalPoint>()
        .x(d => xScale(d.distanceM))
        .y(d => yScale(d.snrDb))
        .curve(d3.curveBasis);

      g.append('path')
        .datum(history)
        .attr('fill', 'none')
        .attr('stroke', '#06B6D4')
        .attr('stroke-width', 1.5)
        .attr('opacity', 0.5);
    }

    // 7. Active Dynamic Selected Point
    if (currentLink) {
      // Glow halo
      g.append('circle')
        .attr('cx', xScale(currentLink.distanceM))
        .attr('cy', yScale(currentLink.snrDb))
        .attr('r', 8)
        .attr('fill', currentLink.isJammed ? 'rgba(239, 68, 68, 0.25)' : 'rgba(6, 182, 212, 0.25)')
        .attr('stroke', currentLink.isJammed ? '#EF4444' : '#06B6D4')
        .attr('stroke-width', 1.5);

      // Core point
      g.append('circle')
        .attr('cx', xScale(currentLink.distanceM))
        .attr('cy', yScale(currentLink.snrDb))
        .attr('r', 4.5)
        .attr('fill', currentLink.isJammed ? '#EF4444' : currentLink.isOperational ? '#22D3EE' : '#F59E0B');

      // Value label badge
      g.append('text')
        .attr('x', xScale(currentLink.distanceM))
        .attr('y', yScale(currentLink.snrDb) - 11)
        .attr('text-anchor', 'middle')
        .attr('fill', currentLink.isJammed ? '#EF4444' : '#22D3EE')
        .attr('font-size', '9px')
        .attr('font-weight', '600')
        .attr('font-family', 'IBM Plex Mono')
        .text(`${currentLink.snrDb} dB @ ${currentLink.distanceM}m`);
    }

    // 8. D3 Axes
    const xAxis = d3.axisBottom(xScale)
      .ticks(5)
      .tickFormat(d => `${d}m`);

    const yAxis = d3.axisLeft(yScale)
      .ticks(5)
      .tickFormat(d => `${d}dB`);

    const xAxisG = g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis);

    xAxisG.selectAll('text')
      .attr('fill', '#94A3B8')
      .attr('font-size', '9px')
      .attr('font-family', 'IBM Plex Mono');
    xAxisG.selectAll('path, line')
      .attr('stroke', '#334155');

    const yAxisG = g.append('g')
      .call(yAxis);

    yAxisG.selectAll('text')
      .attr('fill', '#94A3B8')
      .attr('font-size', '9px')
      .attr('font-family', 'IBM Plex Mono');
    yAxisG.selectAll('path, line')
      .attr('stroke', '#334155');

    // Axis Labels
    g.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + 28)
      .attr('text-anchor', 'middle')
      .attr('fill', '#64748B')
      .attr('font-size', '9px')
      .attr('font-family', 'IBM Plex Mono')
      .text('Distance d (meters)');

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2)
      .attr('y', -32)
      .attr('text-anchor', 'middle')
      .attr('fill', '#64748B')
      .attr('font-size', '9px')
      .attr('font-family', 'IBM Plex Mono')
      .text('Signal-to-Noise Ratio (dB)');

  }, [links, currentLink, history, isExpanded, nodeA, activePair]);

  return (
    <div
      className={`bg-[#0A0E17]/95 border border-[#1E293B] rounded-lg shadow-2xl transition-all duration-200 select-none backdrop-blur-sm ${
        isExpanded ? 'w-[760px]' : 'w-[470px]'
      }`}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-800 bg-slate-950/60 rounded-t-lg">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-xs font-bold text-slate-100 font-sans tracking-wide">
            Real-Time Link Quality (D3: SNR vs Distance)
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
            title={isExpanded ? 'Collapse' : 'Expand Plot'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Node Pair Selector Controls */}
      <div className="px-3.5 py-2 bg-slate-900/50 border-b border-slate-800 flex items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 uppercase">Monitored Link:</span>
          <select
            value={activePair ? `${activePair.nodeAId}-${activePair.nodeBId}` : ''}
            onChange={(e) => {
              const [a, b] = e.target.value.split('-');
              if (a && b) onSelectPair(a, b);
            }}
            className="bg-slate-950 border border-slate-700 text-slate-200 rounded px-2 py-0.5 text-[11px] font-mono focus:border-cyan-500"
          >
            {links.map((l, idx) => {
              const nA = nodes.find(n => n.id === l.nodeAId);
              const nB = nodes.find(n => n.id === l.nodeBId);
              if (!nA || !nB) return null;
              return (
                <option key={idx} value={`${l.nodeAId}-${l.nodeBId}`}>
                  {nA.callsign} ↔ {nB.callsign} ({l.isJammed ? 'JAMMED' : `${l.snrDb}dB`})
                </option>
              );
            })}
          </select>
        </div>

        {currentLink && (
          <div className="flex items-center gap-2 text-[10px]">
            <span className="text-slate-500">ETX:</span>
            <span className="text-slate-300 font-bold tabular-nums">{currentLink.etx}</span>
            <span className="text-slate-500">TQ:</span>
            <span className={`font-bold tabular-nums ${currentLink.tq > 180 ? 'text-cyan-400' : 'text-amber-400'}`}>
              {currentLink.tq}/255
            </span>
          </div>
        )}
      </div>

      {/* D3 SVG Canvas Area */}
      <div className="p-2 flex justify-center">
        <svg
          ref={svgRef}
          width={isExpanded ? 720 : 440}
          height={isExpanded ? 340 : 220}
          className="overflow-visible"
        />
      </div>

      {/* Telemetry Micro-Strip */}
      <div className="px-3.5 py-1.5 bg-slate-950/80 border-t border-slate-800/80 rounded-b-lg flex items-center justify-between text-[10px] font-mono text-slate-400">
        <div className="flex items-center gap-3">
          <span className="text-slate-500">PROPAGATION:</span>
          <span>FSPL 2.4 GHz</span>
          <span aria-hidden="true" className="text-slate-700">·</span>
          <span>TX: {nodeA ? `${nodeA.txPowerDbm} dBm` : '30 dBm'}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full inline-block bg-cyan-400" />
          <span>Active Dynamic Tracking</span>
        </div>
      </div>
    </div>
  );
};
