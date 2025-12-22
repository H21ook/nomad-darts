
import { cn } from '@/lib/utils';
import React from 'react'

const SubmitButton = ({ children, disabled, onClick, className }: { children: React.ReactNode, disabled?: boolean, onClick?: (e: React.MouseEvent) => void, className?: string }) => {
    return (
        <button
            onClick={(e) => {
                e.preventDefault();
                onClick?.(e);
            }}
            disabled={disabled}
            className={cn(
                "relative flex items-center justify-center hover:bg-primary hover:text-dark rounded-2xl font-bold transition-colors duration-200 select-none touch-none",
                "bg-zinc-900 text-white border border-white/5",
                disabled && "opacity-20 grayscale",
                className
            )}
        >
            {children}
        </button>
    )
}

export default SubmitButton