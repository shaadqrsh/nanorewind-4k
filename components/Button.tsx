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

  const baseStyles =
    "group/btn relative inline-flex items-center justify-center gap-2.5 px-6 py-3 " +
    "font-mono text-[13px] font-medium uppercase tracking-widest " +
    "transition-all duration-200 active:translate-y-px " +
    "disabled:opacity-40 disabled:cursor-not-allowed disabled:active:translate-y-0 " +
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950";

  const variants = {
    primary:
      "bg-amber-500 text-ink-950 hover:bg-amber-400 " +
      "shadow-[0_1px_0_rgba(255,255,255,0.25)_inset,0_2px_12px_-2px_rgba(224,164,88,0.55)] " +
      "hover:shadow-[0_1px_0_rgba(255,255,255,0.3)_inset,0_4px_20px_-2px_rgba(224,164,88,0.7)]",
    danger:
      "bg-transparent text-rust-400 border border-rust-500/40 hover:border-rust-500 hover:bg-rust-500/10",
    secondary:
      "bg-ink-800 text-ink-200 border border-ink-700 hover:bg-ink-700 hover:border-ink-600",
    outline:
      "bg-transparent border border-ink-600 text-ink-300 hover:border-amber-500/60 hover:text-amber-400"
  };

  const content = (
    <>
      <span className="relative">{children}</span>
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : Icon ? (
        <Icon className="w-4 h-4 transition-transform duration-200 group-hover/btn:translate-x-0.5" strokeWidth={2} />
      ) : null}
    </>
  );

  if (href) {
    return (
      <a href={href} download={download} className={`${baseStyles} ${variants[variant]} ${className}`}>
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
