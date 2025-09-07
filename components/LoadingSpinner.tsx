"use client"

import { cn } from "@/lib/utils"

export default function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={cn("w-[100px] h-[100px] relative", className)}>
      <svg width="100" height="100" viewBox="0 0 171 171" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="topGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#CD00AA" />
            <stop offset="100%" stopColor="#B502BE" />
          </linearGradient>
          <linearGradient id="sideGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D502AC" />
            <stop offset="100%" stopColor="#693AE6" />
          </linearGradient>
        </defs>
        <g className="animate-logo-part-1">
          <path
            d="M41.5018 39.5C41.5018 39.5 84.0011 79.334 85.3344 79.334C86.6677 79.334 129.001 39 129.001 39C130.002 39 109.767 39 85.5008 39C36 39 41 38.5 41.5018 39.5Z"
            fill="url(#topGradient)"
            strokeLinejoin="round"
          />
          <path
            d="M41.5018 39.5C41.5018 39.5 84.0011 79.334 85.3344 79.334C86.6677 79.334 129.001 39 129.001 39C130.002 39 109.767 39 85.5008 39C36 39 41 38.5 41.5018 39.5Z"
            fill="white"
            className="logo-overlay"
            strokeLinejoin="round"
          />
        </g>
        <g className="animate-logo-part-2">
          <path
            d="M115.436 62.9025L89 87.2193V117.5C89 134.3 89 148 89 148C89.2667 148 101.969 136.369 116.369 122.103L141.837 96.1025V68.251C142.001 52.5 142.001 39 142.001 39C141.734 39 129.836 49.5692 115.436 62.9025Z"
            fill="url(#sideGradient)"
            strokeLinejoin="round"
          />
          <path
            d="M115.436 62.9025L89 87.2193V117.5C89 134.3 89 148 89 148C89.2667 148 101.969 136.369 116.369 122.103L141.837 96.1025V68.251C142.001 52.5 142.001 39 142.001 39C141.734 39 129.836 49.5692 115.436 62.9025Z"
            fill="white"
            className="logo-overlay"
            strokeLinejoin="round"
          />
        </g>
        <g className="animate-logo-part-3">
          <path
            d="M28.0026 67.5991V95.3325L54.2693 121.732C69 135.999 81.7359 148.234 81.7359 148C81.7359 147.5 81.7359 132.5 81.7359 115.999V87.219L70.1359 76.3991C64.1359 71.0658 52.8027 60.7991 44.6693 53.3325C36.4991 45.9998 28.0002 38.9998 28.0002 38.9998C28.0002 38.9998 27.9991 52.4998 28.0026 67.5991Z"
            fill="url(#sideGradient)"
            strokeLinejoin="round"
          />
          <path
            d="M28.0026 67.5991V95.3325L54.2693 121.732C69 135.999 81.7359 148.234 81.7359 148C81.7359 147.5 81.7359 132.5 81.7359 115.999V87.219L70.1359 76.3991C64.1359 71.0658 52.8027 60.7991 44.6693 53.3325C36.4991 45.9998 28.0002 38.9998 28.0002 38.9998C28.0002 38.9998 27.9991 52.4998 28.0026 67.5991Z"
            fill="white"
            className="logo-overlay"
            strokeLinejoin="round"
          />
        </g>
      </svg>
    </div>
  )
}
