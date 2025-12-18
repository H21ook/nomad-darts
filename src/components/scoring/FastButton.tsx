'use client';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface FastButtonProps {
    children: React.ReactNode;
    onPress: () => void;
    className?: string;
    variant?: 'number' | 'submit' | 'undo';
    disabled?: boolean;
}

const FastButton = ({ children, onPress, className, variant = 'number', disabled }: FastButtonProps) => {
    return (
        <motion.button
            // onPointerDown ашиглан 300ms саатлыг алгасна
            onPointerDown={(e) => {
                e.preventDefault();
                if (!disabled) onPress();
            }}
            // Дарах агшинд шууд өнгө солигдох
            whileTap={!disabled ? {
                scale: 0.92,
                backgroundColor: "rgb(6, 182, 212)", // Cyan-500
                color: "rgb(0, 0, 0)",
                transition: { duration: 0 } // Анимацийн хугацаа 0 (Шууд)
            } : {}}
            className={cn(
                "relative flex items-center justify-center rounded-2xl font-bold transition-colors duration-200 select-none touch-none",
                variant === 'number' && "bg-zinc-900 text-white border border-white/5 text-3xl",
                variant === 'submit' && "bg-cyan-500 text-black text-4xl shadow-lg",
                variant === 'undo' && "bg-zinc-900 text-zinc-600 border border-white/5",
                disabled && "opacity-20 grayscale",
                className
            )}
        >
            {children}
        </motion.button>
    );
};

export default FastButton;
