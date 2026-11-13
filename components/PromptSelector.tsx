import React from 'react';

export type DeveloperProcess = 'standard' | 'silver-gelatin' | 'albumen' | 'cyanotype' | 'autochrome' | 'kodachrome';

export interface PromptOptions {
  process: DeveloperProcess;
  chiaroscuro: boolean;
  matte: boolean;
}

interface PromptSelectorProps {
  options: PromptOptions;
  onChange: (options: PromptOptions) => void;
  previewUrl: string;   // the photo the thumbnails are drawn from
  disabled?: boolean;
}

export const PROCESSES = [
  { key: 'standard', label: 'Natural color', desc: 'Realistic, true-to-life restoration.' },
  { key: 'silver-gelatin', label: 'Black & white', desc: 'High-contrast monochrome.' },
  { key: 'albumen', label: 'Sepia', desc: 'A warm brown vintage tone.' },
  { key: 'cyanotype', label: 'Cyanotype blue', desc: 'A Prussian-blue photographic wash.' },
  { key: 'autochrome', label: 'Soft pastel', desc: 'Muted early color with a gentle glow.' },
  { key: 'kodachrome', label: 'Vivid film', desc: 'Punchy reds and rich contrast.' },
] as const;

export const MODIFIERS = [
  { key: 'chiaroscuro', label: 'Deeper shadows', desc: 'More dramatic contrast' },
  { key: 'matte', label: 'Matte finish', desc: 'Softer highlights, like old photo paper' },
] as const;

// Maps a stored treatment back onto selector options, falling back to the
// default style for anything unrecognised.
export const toPromptOptions = (t: { process: string; chiaroscuro: boolean; matte: boolean }): PromptOptions => ({
  process: PROCESSES.find(p => p.key === t.process)?.key ?? 'standard',
  chiaroscuro: t.chiaroscuro,
  matte: t.matte,
});

export const sameOptions = (a: PromptOptions, b: PromptOptions) =>
  a.process === b.process && a.chiaroscuro === b.chiaroscuro && a.matte === b.matte;

export const processLabel = (key: string) => (PROCESSES.find(p => p.key === key) ?? PROCESSES[0]).label;

// "Sepia, deeper shadows"
export const treatmentLabel = (t: { process: string; chiaroscuro: boolean; matte: boolean }) =>
  [processLabel(t.process), ...MODIFIERS.filter(m => t[m.key]).map(m => m.label.toLowerCase())].join(', ');

export const PromptSelector: React.FC<PromptSelectorProps> = ({ options, onChange, previewUrl, disabled = false }) => {
  const keys = PROCESSES.map(p => p.key);
  const current = PROCESSES.find(p => p.key === options.process) ?? PROCESSES[0];

  const select = (process: DeveloperProcess) => onChange({ ...options, process });

  // Arrow keys move through the styles, as in a native radio group.
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const i = keys.indexOf(options.process);
    let n: number | null = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % keys.length;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + keys.length) % keys.length;
    if (n === null) return;
    e.preventDefault();
    select(keys[n]);
    e.currentTarget.querySelector<HTMLButtonElement>(`[data-style="${keys[n]}"]`)?.focus();
  };

  return (
    <>
      <section className="flex flex-col gap-3.5 p-[22px] border-b border-rule">
        <h2 id="style-heading" className="font-display text-[21px] leading-tight">Style</h2>
        <div role="radiogroup" aria-labelledby="style-heading" onKeyDown={onKeyDown}
          className="grid grid-cols-3 gap-x-3.5 gap-y-5">
          {PROCESSES.map(p => {
            const active = p.key === options.process;
            return (
              <button
                key={p.key}
                type="button"
                role="radio"
                aria-checked={active}
                tabIndex={active ? 0 : -1}
                data-style={p.key}
                disabled={disabled}
                onClick={() => select(p.key)}
                className="group flex flex-col gap-2 text-left min-w-0 focus-visible:outline-none disabled:cursor-not-allowed"
              >
                <span className={`mount mount-xs block outline outline-2 outline-offset-[6px] transition-[outline-color]
                  ${active ? 'outline-brass' : 'outline-transparent group-focus-visible:outline-bone'}`}>
                  <img src={previewUrl} alt="" className={`block w-full aspect-square object-cover look-${p.key}`} draggable={false} />
                </span>
                <span className={`text-sm leading-tight ${active ? 'text-brass font-bold' : 'text-bone-2'}`}>{p.label}</span>
              </button>
            );
          })}
        </div>
        <p className="text-[15px] text-bone-2">{current.desc}</p>
        <p className="text-sm text-bone-3">The thumbnails are a rough preview.</p>
      </section>

      <section className="flex flex-col gap-3.5 p-[22px] border-b border-rule">
        <h2 className="font-display text-[21px] leading-tight">Extras</h2>
        {MODIFIERS.map(m => (
          <label key={m.key} className={`relative flex items-start gap-3 ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
            <input
              type="checkbox"
              className="peer sr-only"
              checked={options[m.key]}
              disabled={disabled}
              onChange={() => onChange({ ...options, [m.key]: !options[m.key] })}
            />
            <span aria-hidden="true"
              className="relative shrink-0 w-[22px] h-[22px] mt-px rounded border-[1.5px] border-bone-3 transition-colors
                peer-checked:bg-bone peer-checked:border-bone peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-brass peer-focus-visible:outline-offset-[3px]
                after:content-[''] after:absolute after:left-[6.5px] after:top-[2px] after:w-[5px] after:h-[11px] after:rotate-45
                after:border-page after:border-r-[2.5px] after:border-b-[2.5px] after:opacity-0 peer-checked:after:opacity-100" />
            <span>
              {m.label}
              <small className="block text-[15px] text-bone-3">{m.desc}</small>
            </span>
          </label>
        ))}
      </section>
    </>
  );
};
