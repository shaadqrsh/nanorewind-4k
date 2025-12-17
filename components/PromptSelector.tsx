import React from 'react';
import { Check } from 'lucide-react';

export interface PromptOptions {
  scratches: boolean;
  color: boolean;
  denoise: boolean;
  faces: boolean;
  sharpen: boolean;
}

interface PromptSelectorProps {
  options: PromptOptions;
  onChange: (options: PromptOptions) => void;
}

export const PromptSelector: React.FC<PromptSelectorProps> = ({ options, onChange }) => {
  
  const toggleOption = (key: keyof PromptOptions) => {
    onChange({ ...options, [key]: !options[key] });
  };

  const items = [
    { 
      key: 'scratches', 
      label: 'Texture Inpainting', 
      desc: 'Synthesizes missing data in scratches & tears.' 
    },
    { 
      key: 'color', 
      label: 'White Balance Fix', 
      desc: 'Removes sepia/yellow casts for accurate skin tones.' 
    },
    { 
      key: 'denoise', 
      label: 'Artifact Removal', 
      desc: 'Cleans JPEG compression & digital noise.' 
    },
    { 
      key: 'faces', 
      label: 'Biometric Refinement', 
      desc: 'Restores high-res iris, lash & dental details.' 
    },
    { 
      key: 'sharpen', 
      label: 'Optical Deblurring', 
      desc: 'Corrects motion blur & lens softness.' 
    },
  ] as const;

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <span className="bg-banana-500 text-slate-900 rounded-lg p-1 w-8 h-8 flex items-center justify-center text-sm font-bold">2</span>
        Restoration Options
      </h2>
      <p className="text-slate-400 text-sm mb-4">
        Select the specific defects you want to correct.
      </p>
      
      <div className="flex flex-col space-y-3">
        {items.map((item) => (
          <div 
            key={item.key}
            onClick={() => toggleOption(item.key)}
            className={`
              relative p-4 rounded-xl border cursor-pointer transition-all duration-200 select-none flex items-center justify-between
              ${options[item.key as keyof PromptOptions]
                ? 'bg-banana-500/10 border-banana-500 shadow-[0_0_10px_rgba(234,179,8,0.05)]'
                : 'bg-slate-900/50 border-slate-700 hover:border-slate-600 hover:bg-slate-800'
              }
            `}
          >
            <div className="flex flex-col">
              <span className={`font-semibold text-sm ${options[item.key as keyof PromptOptions] ? 'text-banana-400' : 'text-slate-200'}`}>
                {item.label}
              </span>
              <span className="text-xs text-slate-500 mt-0.5">
                {item.desc}
              </span>
            </div>
            
            <div className={`
              w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center border transition-colors ml-4
              ${options[item.key as keyof PromptOptions]
                ? 'bg-banana-500 border-banana-500 text-slate-900'
                : 'border-slate-600 bg-slate-900'
              }
            `}>
              {options[item.key as keyof PromptOptions] && <Check className="w-3.5 h-3.5" strokeWidth={4} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};