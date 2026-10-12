/**
 * Top Navigation Bar conforming to the Universal Frontend Design Top Bar Contract
 * Zone 1: Single text wordmark
 * Zone 2: Single-line navigation links
 * Zone 3: Single primary action CTA
 */

import React from 'react';
import { Send, Play, Pause, RotateCcw } from 'lucide-react';

export type ActiveTab = 'tactical_canvas' | 'rf_heatmap' | 'protocol_engine' | 'zero_trust' | 'dtn_custody' | 'standards' | 'benchmarks';

interface TopBarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenTransmitModal: () => void;
  isPaused: boolean;
  onTogglePause: () => void;
  onResetScenario: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onSelectTab,
  onOpenTransmitModal,
  isPaused,
  onTogglePause,
  onResetScenario,
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-[#0A0E17] border-b border-[#1E293B] sticky top-0 z-40 select-none">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-4">
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); onSelectTab('tactical_canvas'); }}
          className="text-lg font-bold tracking-wider text-slate-100 hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0"
        >
          ARES-MESH
        </a>
        <div className="hidden xl:flex items-center gap-2 text-xs text-slate-400 font-mono">
          <span className="text-slate-500">TACTICAL PROTOCOL</span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span>STANAG 4586</span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span>CCSDS 9171</span>
        </div>
      </div>

      {/* Zone 2: 4-6 clean single-line navigation links */}
      <nav className="hidden lg:flex items-center gap-1 text-xs font-medium">
        <button
          onClick={() => onSelectTab('tactical_canvas')}
          className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'tactical_canvas'
              ? 'bg-slate-800 text-cyan-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          Tactical Operations
        </button>
        <button
          onClick={() => onSelectTab('rf_heatmap')}
          className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'rf_heatmap'
              ? 'bg-slate-800 text-rose-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          RF Spectrum Heatmap
        </button>
        <button
          onClick={() => onSelectTab('protocol_engine')}
          className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'protocol_engine'
              ? 'bg-slate-800 text-cyan-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          Protocol Routing
        </button>
        <button
          onClick={() => onSelectTab('zero_trust')}
          className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'zero_trust'
              ? 'bg-slate-800 text-cyan-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          Zero-Trust Security
        </button>
        <button
          onClick={() => onSelectTab('dtn_custody')}
          className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'dtn_custody'
              ? 'bg-slate-800 text-amber-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          DTN Custody Transfer
        </button>
        <button
          onClick={() => onSelectTab('standards')}
          className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'standards'
              ? 'bg-slate-800 text-cyan-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          Standards Inspector
        </button>
        <button
          onClick={() => onSelectTab('benchmarks')}
          className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'benchmarks'
              ? 'bg-slate-800 text-cyan-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          Evaluation Benchmarks
        </button>
      </nav>

      {/* Zone 3: Quick Sim Controls + 1 primary action */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          onClick={onTogglePause}
          title={isPaused ? 'Resume Simulation' : 'Pause Simulation'}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-300 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 rounded transition-colors whitespace-nowrap shrink-0"
        >
          {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5 text-amber-400" />}
          <span>{isPaused ? 'Resume' : 'Pause'}</span>
        </button>

        <button
          onClick={onResetScenario}
          title="Reset Topology to Default"
          className="p-1.5 text-slate-400 hover:text-slate-200 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded transition-colors whitespace-nowrap shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onOpenTransmitModal}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-900 bg-cyan-400 hover:bg-cyan-300 rounded transition-colors whitespace-nowrap shrink-0 shadow-sm"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Dispatch Packet</span>
        </button>
      </div>
    </header>
  );
};
