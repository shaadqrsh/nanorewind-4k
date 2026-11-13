import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'quiet' | 'danger';
  size?: 'md' | 'sm';
  isLoading?: boolean;
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-full border-[1.5px] font-bold whitespace-nowrap ' +
  'transition-colors duration-150 disabled:opacity-45 disabled:cursor-not-allowed';

const sizes = {
  md: 'min-h-12 px-6 text-base',
  sm: 'min-h-10 px-[18px] text-[15px]',
};

const variants = {
  primary: 'bg-bone text-page border-bone hover:bg-corner hover:border-corner disabled:hover:bg-bone',
  quiet: 'bg-transparent text-bone border-bone-3 hover:border-bone disabled:hover:border-bone-3',
  danger: 'bg-transparent text-rust border-rust/60 hover:border-rust hover:bg-rust/10',
};

export const buttonClass = (variant: ButtonProps['variant'] = 'primary', size: ButtonProps['size'] = 'md') =>
  `${base} ${sizes[size]} ${variants[variant]}`;

export const Button: React.FC<ButtonProps> = ({
  children, variant = 'primary', size = 'md', className = '', isLoading, disabled, type = 'button', ...props
}) => (
  <button type={type} className={`${buttonClass(variant, size)} ${className}`} disabled={disabled || isLoading} {...props}>
    {isLoading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
    {children}
  </button>
);
