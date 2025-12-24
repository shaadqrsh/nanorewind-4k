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
      desc: 'Erases scratches and tears.' 
    },
    { 
      key: 'color', 
      label: 'White Balance Fix', 
      desc: 'Removes vintage color casts.' 
    },
    { 
      key: 'denoise', 
      label: 'Artifact Removal', 
      desc: 'Cleans digital noise.' 
    },
    { 
      key: 'faces', 
      label: 'Biometric Refinement', 
      desc: 'Restores iris and skin detail.' 
    },
    { 
      key: 'sharpen', 
      label: 'Optical Deblurring', 
      desc: 'Fixes slight lens blur.' 
    },
  ] as const;

  return (
    <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-xl backdrop-blur-sm">
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-slate-900 dark:text-white">
        <span className="bg-banana-500 text-slate-900 rounded-lg w-6 h-6 flex items-center justify-center text-xs font-bold">2</span>
        Restoration Options
      </h2>
      
      <div className="flex flex-col space-y-2">
        {items.map((item) => (
          <div 
            key={item.key}
            onClick={() => toggleOption(item.key)}
            className={`
              relative p-3 rounded-xl border cursor-pointer transition-all duration-200 select-none flex items-center justify-between
              ${options[item.key as keyof PromptOptions]
                ? 'bg-banana-500/10 border-banana-500'
                : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
              }
            `}
          >
            <div className="flex flex-col">
              <span className={`font-semibold text-xs ${options[item.key as keyof PromptOptions] ? 'text-banana-600 dark:text-banana-400' : 'text-slate-700 dark:text-slate-200'}`}>
                {item.label}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-500 mt-0.5">
                {item.desc}
              </span>
            </div>
            
            <div className={`
              w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border transition-colors ml-3
              ${options[item.key as keyof PromptOptions]
                ? 'bg-banana-500 border-banana-500 text-slate-900'
                : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
              }
            `}>
              {options[item.key as keyof PromptOptions] && <Check className="w-2.5 h-2.5" strokeWidth={4} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};