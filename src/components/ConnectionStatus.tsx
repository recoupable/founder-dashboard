'use client'

import { useState } from 'react'
import { CheckCircle2, ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ConnectionStatusProps {
  className?: string;
}

export function ConnectionStatus({ className }: ConnectionStatusProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className={cn("flex items-center gap-2", className)}
        >
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          API Status
          <ChevronDown className={cn(
            "h-4 w-4 transition-transform duration-200",
            isOpen ? "rotate-180" : ""
          )} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        <DropdownMenuLabel>API Connections</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="p-2 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">Stripe</span>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Supabase</span>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Privy</span>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 