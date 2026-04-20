import * as React from 'react'
import { cva } from 'class-variance-authority'

import { cn } from '../../lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold tracking-[0.16em] uppercase transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-white text-gray-900',
        secondary: 'border-transparent bg-gray-100 text-gray-900',
        destructive: 'border-transparent bg-red-600 text-white',
        outline: 'border-white/20 text-white/80',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function Badge({ className, variant, ...props }) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
