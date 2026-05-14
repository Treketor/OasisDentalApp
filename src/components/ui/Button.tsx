import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: ButtonVariant
}

const variants: Record<ButtonVariant, string> = {
  primary: 'border-accent bg-accent text-white hover:bg-accentDark hover:border-accentDark',
  secondary: 'border-border bg-surface text-text hover:border-accent hover:bg-background hover:text-accentDark',
  ghost: 'border-transparent bg-transparent text-muted hover:text-text',
}

export function Button({ children, className, variant = 'primary', ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex h-11 items-center justify-center rounded-2xl border px-5 text-sm font-semibold transition duration-150 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0',
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
