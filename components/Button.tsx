import React from 'react';
import { LucideIcon, Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: LucideIcon;
  variant?: 'primary' | 'danger' | 'secondary' | 'outline';
  href?: string;
  download?: string;
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  icon: Icon, 
  variant = 'primary', 
  className = '', 
  href, 
  download,
  isLoading,
  disabled,
  ...props 
}) => {
  
  const baseStyles = "flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg";
  
  const variants = {
    primary: "bg-gradient-to-r from-banana-500 to-banana-600 hover:from-banana-400 hover:to-banana-500 text-slate-900 shadow-banana-500/20 hover:shadow-banana-500/30",
    danger: "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 shadow-red-500/10",
    secondary: "bg-slate-700 text-white hover:bg-slate-600 shadow-slate-900/20",
    outline: "bg-transparent border-2 border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white"
  };

  const content = (
    <>
      <span>{children}</span>
      {isLoading ? (
        <Loader2 className="w-5 h-5 animate-spin ml-1" />
      ) : Icon ? (
        <Icon className="w-5 h-5 ml-1" />
      ) : null}
    </>
  );

  if (href) {
    return (
      <a 
        href={href} 
        download={download}
        className={`${baseStyles} ${variants[variant]} ${className}`}
      >
        {content}
      </a>
    );
  }

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {content}
    </button>
  );
};