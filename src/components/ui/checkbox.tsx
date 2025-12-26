"use client"

import * as React from "react"
import { Checkbox as CheckboxPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { IconCheck } from "@tabler/icons-react"
import { cva } from "class-variance-authority"

function Checkbox({
  className,
  size,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root> & { size?: 'md' | 'lg' | 'sm' }) {

  const variants = cva("border-border/30 bg-card/50 data-checked:bg-primary data-checked:text-primary-foreground dark:data-checked:bg-primary data-checked:border-primary aria-invalid:aria-checked:border-primary aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 flex items-center justify-center border shadow-xs transition-shadow group-has-disabled/field:opacity-50 focus-visible:ring-[3px] aria-invalid:ring-[3px] peer relative shrink-0 outline-none after:absolute after:-inset-x-3 after:-inset-y-2 disabled:cursor-not-allowed disabled:opacity-50", {
    variants: {
      size: {
        sm: "size-4 rounded-[4px]",
        md: "size-5 rounded-[6px]",
        lg: "size-6 rounded-[8px]",
      },
    },
    defaultVariants: {
      size: "md",
    },
  })

  const indicatorVariants = cva("grid place-content-center text-current transition-none", {
    variants: {
      size: {
        sm: "[&>svg]:size-3.5",
        md: "[&>svg]:size-4",
        lg: "[&>svg]:size-4.5",
      },
    },
    defaultVariants: {
      size: "md",
    },
  })

  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        variants({ size, className }),
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className={cn(indicatorVariants({ size }))}
      >
        <IconCheck />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root >
  )
}

export { Checkbox }
