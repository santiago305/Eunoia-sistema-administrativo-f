export function LogoLarge() {
  return (
    <div className="flex items-center gap-2">
      <div className="h-10 w-10 rounded-[4px] bg-[#21b8a6]/10 grid place-items-center text-[#21b8a6]">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
          <path
            d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M12 7v10"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div className="leading-tight">
        <div className="text-[13px] font-semibold text-slate-900">Panel</div>
        <div className="text-[11px] text-slate-500">Admin Dashboard</div>
      </div>
    </div>
  )
}

export function LogoSmall() {
  return (
    <div className="h-10 w-10 rounded-[4px] bg-[#21b8a6]/10 grid place-items-center text-[#21b8a6]">
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
        <path
          d="M12 4l7 4v8l-7 4-7-4V8l7-4Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}
