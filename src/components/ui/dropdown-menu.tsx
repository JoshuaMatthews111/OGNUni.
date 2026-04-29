import * as React from "react"
import { cn } from "@/lib/utils"

interface DropdownMenuProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

const DropdownMenu = ({ open, onOpenChange, children }: DropdownMenuProps) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const currentOpen = open ?? isOpen

  return (
    <div className="relative inline-block">
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            ...child.props,
            isOpen: currentOpen,
            setIsOpen: onOpenChange ?? setIsOpen,
          } as any)
        }
        return child
      })}
    </div>
  )
}

const DropdownMenuTrigger = React.forwardRef<HTMLButtonElement, any>(
  ({ asChild, children, isOpen, setIsOpen, ...props }, ref) => {
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children, {
        ref,
        onClick: () => setIsOpen?.(!isOpen),
      } as any)
    }
    return (
      <button ref={ref} onClick={() => setIsOpen?.(!isOpen)} {...props}>
        {children}
      </button>
    )
  }
)
DropdownMenuTrigger.displayName = "DropdownMenuTrigger"

const DropdownMenuContent = React.forwardRef<HTMLDivElement, any>(
  ({ className, align = 'center', isOpen, ...props }, ref) => {
    if (!isOpen) return null

    const alignments = {
      start: 'left-0',
      center: 'left-1/2 -translate-x-1/2',
      end: 'right-0',
    }

    return (
      <div
        ref={ref}
        className={cn(
          "absolute z-50 mt-2 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
          alignments[align],
          className
        )}
        {...props}
      />
    )
  }
)
DropdownMenuContent.displayName = "DropdownMenuContent"

const DropdownMenuItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent",
        className
      )}
      {...props}
    />
  )
)
DropdownMenuItem.displayName = "DropdownMenuItem"

export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem }
