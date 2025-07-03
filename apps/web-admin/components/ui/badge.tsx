"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center text-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        subtle: "bg-muted text-muted-foreground",
        success: "bg-green-500 text-white hover:bg-green-600",
        info: "bg-blue-500 text-white hover:bg-blue-600",
        warning: "bg-yellow-500 text-white hover:bg-yellow-600",
        error: "bg-red-500 text-white hover:bg-red-600",
        light: "bg-white text-black border border-gray-300 hover:bg-gray-50",
        dark: "bg-gray-800 text-white border border-gray-700 hover:bg-gray-700",
        gradient0: "bg-gradient-to-r from-teal-700 to-teal-500 text-white hover:from-blue-600 hover:to-green-600",
        gradient1: "bg-gradient-to-r from-purple-700 to-purple-500 text-white hover:from-purple-600 hover:to-pink-600",
        gradient2: "bg-gradient-to-r from-red-600 to-red-400 text-white hover:from-red-600 hover:to-yellow-600",
        gradient3: "bg-gradient-to-r from-teal-500 to-cyan-500 text-white hover:from-teal-600 hover:to-cyan-600",
        gradient4: "bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600",
        gradient5: "bg-gradient-to-r from-pink-500 to-red-500 text-white hover:from-pink-600 hover:to-red-600",
        gradient6: "bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:from-yellow-600 hover:to-orange-600",
        gradient7: "bg-gradient-to-r from-violet-500 to-violet-700 text-white hover:from-gray-600 hover:to-gray-800",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      'ירקות 🥬': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'פירות 🍎': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      'דגים 🐟': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'בשר 🥩': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      'ביצים 🥚': 'bg-yellow-50 text-yellow-900 dark:bg-yellow-950 dark:text-yellow-100',
      'מאפים 🥐': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
      'מוצרי חלב 🧀': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'לחם 🍞': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
      'לחמים 🍞': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
      'קפואים ❄️': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
      'קינוחים 🍰': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
      'תבלינים 🌶️': 'bg-red-200 text-red-900 dark:bg-red-900 dark:text-red-100',
      'שימורים 🥫': 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
      'שימורים ותיבול 🫘🧂': 'bg-zinc-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
      'משקאות 🥤': 'bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-100',
      'אלכוהול 🍷': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'שתייה קלה 🥤': 'bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-100',
      'שתייה חריפה 🍸': 'bg-purple-200 text-purple-900 dark:bg-purple-900 dark:text-purple-100',
      'חטיפים 🍟': 'bg-yellow-200 text-yellow-900 dark:bg-yellow-900 dark:text-yellow-100',
      'דגים וים 🐟🍣': 'bg-blue-200 text-blue-900 dark:bg-blue-900 dark:text-blue-100',
      'פירות ים 🦞': 'bg-cyan-200 text-cyan-900 dark:bg-cyan-900 dark:text-cyan-100',
      'מאפייה 🥐': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
      'בשר ועוף 🥩🍗': 'bg-red-200 text-red-900 dark:bg-red-900 dark:text-red-100',
      'עוף 🍗': 'bg-orange-200 text-orange-900 dark:bg-orange-900 dark:text-orange-100',
      'טבעוני 🌱': 'bg-green-200 text-green-900 dark:bg-green-900 dark:text-green-100',
      'קשות 🍪': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'מזווה 🧂📦': 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200',
      'מקרר 🥶': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
      'ירקות ופירות 🥬🍅': 'bg-green-200 text-green-900 dark:bg-green-900 dark:text-green-100',
      'לחם ומאפייה 🍞🥐': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
      'מוצרי מזווה 🧂📦': 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200',
      'חד פעמי 📦': 'bg-orange-200 text-gray-800 dark:bg-orange-800 dark:text-gray-200',
      'תחזוקה ⚙️': 'bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
      'ניקיון 🧼': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'שמן 🫒': 'bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100',
      'אריזות 📦': 'bg-orange-200 text-gray-800 dark:bg-orange-800 dark:text-gray-200',
      'קופסאות 📦': 'bg-orange-200 text-gray-800 dark:bg-orange-800 dark:text-gray-200',
      'ציוד 🛠️': 'bg-gray-300 text-gray-900 dark:bg-gray-700 dark:text-gray-200',
    };
    
    return (
      <Badge key={category} className={(colors[category] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200') + " text-xs text-nowrap w-fit mx-[2px] cursor-default text-center flex items-center gap-1"}>
        {category}
      </Badge>
    );
  };

export { Badge, badgeVariants, getCategoryBadge }
