"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { IconArrowLeft } from "@tabler/icons-react"
import { cn } from "@/lib/utils"

export interface AppBarProps extends React.HTMLAttributes<HTMLDivElement> {
    title: string
    onBack?: () => void
    backHref?: string
    actions?: React.ReactNode
    description?: string
}

export function AppBar({
    title,
    onBack,
    backHref,
    actions,
    className,
    description,
    ...props
}: AppBarProps) {
    const router = useRouter()

    const handleBack = () => {
        if (onBack) {
            onBack()
        } else if (backHref) {
            router.push(backHref)
        } else {
            router.back()
        }
    }

    return (
        <div
            className={cn(
                "sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/50",
                className
            )}
            {...props}
        >
            <div className="flex items-center justify-between px-4 h-14">
                {/* Back Button */}
                {(onBack || backHref !== undefined) && (
                    <button
                        onClick={handleBack}
                        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors -ml-2 p-2"
                        aria-label="Go back"
                    >
                        <IconArrowLeft size={24} />
                    </button>
                )}

                {/* Title */}
                <div>
                    <h1 className="text-lg font-bold flex-1 text-center">{title}</h1>
                    {description && <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">{description}</p>}
                </div>

                {/* Actions or Spacer */}
                <div className="w-10 flex items-center justify-end">
                    {actions}
                </div>
            </div>
        </div>
    )
}
