import React from 'react';
import { Check, Circle } from 'lucide-react';

export type DeveloperProcess = 'standard' | 'silver-gelatin' | 'albumen' | 'cyanotype' | 'autochrome' | 'kodachrome';

export interface PromptOptions {
  process: DeveloperProcess;
  chiaroscuro: boolean;
  matte: boolean;
}

interface PromptSelectorProps {
  options: PromptOptions;
  onChange: (options: PromptOptions) => void;
}

export const PromptSelector: React.FC<PromptSelectorProps> = ({ options, onChange }) => {

  const setProcess = (process: DeveloperProcess) => {
    onChange({ ...options, process });
  };

  const toggleModifier = (key: 'chiaroscuro' | 'matte') => {
    onChange({ ...options, [key]: !options[key] });
  };

  const processes = [
    { key: 'standard', code: 'ST', label: 'Standard Development', desc: 'True-to-source natural color balancing' },
    { key: 'silver-gelatin', code: 'SG', label: 'Silver Gelatin (B&W)', desc: 'Rich high-contrast monochrome silver print' },
    { key: 'albumen', code: 'AP', label: 'Albumen Print (Sepia)', desc: 'Warm sepia tones of 19th-century prints' },
    { key: 'cyanotype', code: 'CP', label: 'Cyanotype Wash', desc: 'Prussian blue wash from historic iron process' },
    { key: 'autochrome', code: 'AC', label: 'Lumière Autochrome', desc: 'Early color plate pastel tones & soft glow' },
    { key: 'kodachrome', code: 'KC', label: 'Kodachrome 64', desc: 'Vibrant mid-century reds & rich contrast slide' },
  ] as const;

  const modifiers = [
    { key: 'chiaroscuro', code: 'CS', label: 'Chiaroscuro Mod', desc: 'Steepen tone curve to deepen dramatic shadows' },
    { key: 'matte', code: 'MT', label: 'Matte Emulsion', desc: 'Soften highlights to simulate vintage paper texture' },
  ] as const;

  return (
    <section className="relative bg-ink-900/60 border border-ink-800 shadow-plate">
      <div className="absolute inset-0 hairline pointer-events-none" />
      
      <header className="flex items-center gap-3 px-4 py-3.5 border-b border-ink-800">
        <span className="font-mono text-[11px] text-amber-500/80">02</span>
        <h2 className="font-display text-base font-semibold text-ink-100">Treatment ledger</h2>
      </header>

      {/* Group A: Developer Tones */}
      <div className="px-4 py-2 bg-ink-950/40 border-b border-ink-800/80">
        <span className="font-mono text-[9px] uppercase tracking-widest text-ink-500">Chemical Process (Select One)</span>
      </div>
      <div className="divide-y divide-ink-800/70">
        {processes.map((item) => {
          const active = options.process === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setProcess(item.key)}
              className={`group w-full flex items-center gap-3.5 px-4 py-2.5 text-left transition-colors duration-150
                ${active ? 'bg-amber-500/[0.04]' : 'hover:bg-ink-850/60'}`}
            >
              <span className={`shrink-0 font-mono text-[9px] tracking-wider w-7 text-center py-0.5 border transition-colors
                ${active ? 'border-amber-500/40 text-amber-400' : 'border-ink-700 text-ink-500'}`}>
                {item.code}
              </span>

              <span className="flex-1 min-w-0">
                <span className={`block text-[12px] font-medium transition-colors ${active ? 'text-ink-100' : 'text-ink-300'}`}>
                  {item.label}
                </span>
                <span className="block text-[10px] text-ink-500 mt-0.5 truncate">{item.desc}</span>
              </span>

              <span className={`shrink-0 grid place-items-center w-4.5 h-4.5 rounded-full border transition-all duration-150
                ${active
                  ? 'border-amber-500 text-amber-500 bg-amber-500/10'
                  : 'border-ink-600 text-transparent group-hover:border-ink-500'}`}>
                <div className={`w-2 h-2 rounded-full bg-amber-500 transition-opacity ${active ? 'opacity-100' : 'opacity-0'}`} />
              </span>
            </button>
          );
        })}
      </div>

      {/* Group B: Emulsion Modifiers */}
      <div className="px-4 py-2 bg-ink-950/40 border-t border-b border-ink-800/80">
        <span className="font-mono text-[9px] uppercase tracking-widest text-ink-500">Atmospheric Modifiers (Optional)</span>
      </div>
      <div className="divide-y divide-ink-800/70">
        {modifiers.map((item) => {
          const active = options[item.key];
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => toggleModifier(item.key)}
              className={`group w-full flex items-center gap-3.5 px-4 py-2.5 text-left transition-colors duration-150
                ${active ? 'bg-amber-500/[0.04]' : 'hover:bg-ink-850/60'}`}
            >
              <span className={`shrink-0 font-mono text-[9px] tracking-wider w-7 text-center py-0.5 border transition-colors
                ${active ? 'border-amber-500/40 text-amber-400' : 'border-ink-700 text-ink-500'}`}>
                {item.code}
              </span>

              <span className="flex-1 min-w-0">
                <span className={`block text-[12px] font-medium transition-colors ${active ? 'text-ink-100' : 'text-ink-300'}`}>
                  {item.label}
                </span>
                <span className="block text-[10px] text-ink-500 mt-0.5 truncate">{item.desc}</span>
              </span>

              <span className={`shrink-0 grid place-items-center w-4.5 h-4.5 border transition-all duration-150
                ${active
                  ? 'bg-amber-500 border-amber-500 text-ink-950'
                  : 'border-ink-600 text-transparent group-hover:border-ink-500'}`}>
                <Check className="w-3 h-3" strokeWidth={3.5} />
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};

