import type { SVGProps } from "react";

export function PlaceholderPattern({ className = "", ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 200 80" {...props}>
      <path d="M-10 65 35 20l28 28 37-37 55 55 48-48" stroke="currentColor" strokeWidth="1.5" />
      <path d="M-5 78 42 31l27 27 36-36 56 56 43-43" stroke="currentColor" strokeOpacity=".45" strokeWidth="1.5" />
    </svg>
  );
}
