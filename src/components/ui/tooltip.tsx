"use client"

import * as React from "react"
import { useState } from "react"

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

export function Tooltip({ children }: { children: React.ReactNode }) {
  return <div className="relative inline-flex">{children}</div>
}

export function TooltipTrigger({ 
  children, 
  asChild = false 
}: { 
  children: React.ReactNode
  asChild?: boolean 
}) {
  return <>{children}</>
}

export function TooltipContent({ 
  children,
  className = ""
}: { 
  children: React.ReactNode
  className?: string 
}) {
  return (
    <div
      className={`absolute z-50 top-full left-1/2 transform -translate-x-1/2 mt-1 
                  max-w-xs overflow-hidden rounded-md border bg-white px-3 py-1.5 
                  text-sm text-gray-700 shadow-md ${className}`}
    >
      {children}
    </div>
  )
} 