import { cn } from "@/lib/utils"

export function IconHome({ className }: { className?: string }) {
  return (
    <svg className={cn("h-5 w-5", className)} viewBox="0 0 24 24" fill="none">
      <path
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function IconUsers({ className }: { className?: string }) {
  return (
    <svg className={cn("h-5 w-5", className)} viewBox="0 0 24 24" fill="none">
      <path
        d="M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M4.5 20c1.7-3.2 4.4-5 7.5-5s5.8 1.8 7.5 5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}
export function IconLock({ className }: { className?: string }) {
    return (
        <svg className={cn("h-5 w-5", className)} viewBox="0 0 24 24" fill="none">
            <rect 
             x="5" y="10" width="14" height="10" rx="2" 
             stroke="currentColor" strokeWidth="1.8" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor"
             strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="12" cy="15" r="1.5" fill="currentColor" />
        </svg>
    );
}

export function IconSettings({ className }: { className?: string }) {
  return (
    <svg className={cn("h-5 w-5", className)} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M19.4 13.5v-3l-2.1-.8c-.2-.6-.6-1.1-1-1.6l.9-2L14.6 4l-1.6 1.6c-.7-.1-1.3-.1-2 0L9.4 4 6.8 6.1l.9 2c-.4.5-.7-1-1 1.6l-2.1.8v3l2.1.8c.2.6.6 1.1 1 1.6l-.9 2L9.4 20l1.6-1.6c.7.1 1.3.1 2 0l1.6 1.6 2.6-2.1-.9-2c.4-.5.7-1 1-1.6l2.1-.8Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
        opacity="0.9"
      />
    </svg>
  )
}

export function IconChevron({ className }: { className?: string }) {
  return (
    <svg className={cn("h-4 w-4", className)} viewBox="0 0 24 24" fill="none">
      <path
        d="m9 6 6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function IconLogout({ className }: { className?: string }) {
  return (
    <svg className={cn("h-5 w-5", className)} viewBox="0 0 24 24" fill="none">
      <path
        d="M10 7V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-1"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M3 12h11"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="m7 8-4 4 4 4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
