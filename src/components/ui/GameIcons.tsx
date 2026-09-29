/**
 * Realm of Crowns - Premium 4X Fantasy Game Icon Language
 * Vector-illustrated, jewel-toned strategic icons with metallic depth, specular highlights, and fantasy styling.
 */

import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

export const GameIcons = {
  // 1. Core Resources
  Food: ({ className = 'w-4 h-4', size }: IconProps) => (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      width={size}
      height={size}
    >
      <defs>
        <linearGradient id="foodGrad" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="50%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#854d0e" />
        </linearGradient>
      </defs>
      <path
        d="M16 28C16 28 16 16 22 10C24 8 27 7 28 7C28 8 27 11 25 13C21 17 17 21 16 28Z"
        fill="url(#foodGrad)"
        stroke="#713f12"
        strokeWidth="1.5"
      />
      <path
        d="M16 28C16 28 16 16 10 10C8 8 5 7 4 7C4 8 5 11 7 13C11 17 15 21 16 28Z"
        fill="url(#foodGrad)"
        stroke="#713f12"
        strokeWidth="1.5"
      />
      <path
        d="M16 4C14.5 9 14.5 16 16 28C17.5 16 17.5 9 16 4Z"
        fill="#fde047"
        stroke="#854d0e"
        strokeWidth="1.5"
      />
      <circle cx="16" cy="14" r="2.5" fill="#fef08a" />
    </svg>
  ),

  Wood: ({ className = 'w-4 h-4', size }: IconProps) => (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      width={size}
      height={size}
    >
      <defs>
        <linearGradient id="woodBark" x1="4" y1="6" x2="28" y2="26" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#a16207" />
          <stop offset="50%" stopColor="#78350f" />
          <stop offset="100%" stopColor="#451a03" />
        </linearGradient>
        <linearGradient id="woodRings" x1="22" y1="8" x2="28" y2="14" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="100%" stopColor="#ca8a04" />
        </linearGradient>
      </defs>
      {/* Log 1 */}
      <path
        d="M6 18L22 7C24.5 8.5 25.5 11 24 13.5L8 24.5C6.5 23 5 20.5 6 18Z"
        fill="url(#woodBark)"
        stroke="#291104"
        strokeWidth="1.2"
      />
      <ellipse cx="7" cy="21.5" rx="2.5" ry="3.5" transform="rotate(-35 7 21.5)" fill="url(#woodRings)" stroke="#451a03" strokeWidth="1" />
      {/* Log 2 Bottom */}
      <path
        d="M11 26L27 15C29 17 29.5 19.5 28 21.5L12 30C10.5 29 10 27.5 11 26Z"
        fill="url(#woodBark)"
        stroke="#291104"
        strokeWidth="1.2"
      />
      {/* Green sprig leaf accent */}
      <path d="M18 6C18 6 22 4 25 5C26 8 24 11 24 11C24 11 21 9 18 6Z" fill="#22c55e" stroke="#14532d" strokeWidth="0.8" />
    </svg>
  ),

  Stone: ({ className = 'w-4 h-4', size }: IconProps) => (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      width={size}
      height={size}
    >
      <defs>
        <linearGradient id="stoneGrad1" x1="6" y1="6" x2="26" y2="26" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#cbd5e1" />
          <stop offset="50%" stopColor="#64748b" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>
      </defs>
      <path
        d="M16 4L27 10L25 24L16 28L7 22L5 11L16 4Z"
        fill="url(#stoneGrad1)"
        stroke="#1e293b"
        strokeWidth="1.5"
      />
      <path d="M16 4L16 28M16 16L27 10M16 16L7 22M16 16L5 11M16 16L25 24" stroke="#94a3b8" strokeWidth="1" strokeLinecap="round" />
      <polygon points="16,4 21,8 16,16 11,8" fill="#f1f5f9" fillOpacity="0.4" />
    </svg>
  ),

  Iron: ({ className = 'w-4 h-4', size }: IconProps) => (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      width={size}
      height={size}
    >
      <defs>
        <linearGradient id="ironGrad" x1="4" y1="8" x2="28" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#93c5fd" />
          <stop offset="35%" stopColor="#3b82f6" />
          <stop offset="70%" stopColor="#1e3a8a" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
      </defs>
      {/* Forged Ingot Bar */}
      <polygon points="6,12 18,6 27,10 15,16" fill="#bfdbfe" stroke="#1e3a8a" strokeWidth="1" />
      <polygon points="15,16 27,10 27,20 15,26" fill="url(#ironGrad)" stroke="#1e3a8a" strokeWidth="1" />
      <polygon points="6,12 15,16 15,26 6,22" fill="#2563eb" stroke="#1e3a8a" strokeWidth="1" />
      {/* Specular highlight glint */}
      <line x1="8" y1="13" x2="16" y2="9" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  ),

  Gold: ({ className = 'w-4 h-4', size }: IconProps) => (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      width={size}
      height={size}
    >
      <defs>
        <radialGradient id="goldCoin" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="45%" stopColor="#eab308" />
          <stop offset="85%" stopColor="#a16207" />
          <stop offset="100%" stopColor="#713f12" />
        </radialGradient>
      </defs>
      {/* Outer Coin */}
      <circle cx="16" cy="16" r="13" fill="url(#goldCoin)" stroke="#78350f" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="10.5" stroke="#fef08a" strokeWidth="1" strokeDasharray="1.5 1.5" />
      {/* Crown Inscription */}
      <path
        d="M11 19L11 15L13.5 17L16 13L18.5 17L21 15L21 19Z"
        fill="#fef08a"
        stroke="#854d0e"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <rect x="11" y="19.5" width="10" height="1.8" rx="0.5" fill="#fef08a" stroke="#854d0e" strokeWidth="0.8" />
    </svg>
  ),

  Gems: ({ className = 'w-4 h-4', size }: IconProps) => (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      width={size}
      height={size}
    >
      <defs>
        <linearGradient id="gemGrad" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6ee7b7" />
          <stop offset="40%" stopColor="#10b981" />
          <stop offset="80%" stopColor="#047857" />
          <stop offset="100%" stopColor="#064e3b" />
        </linearGradient>
      </defs>
      <polygon points="10,5 22,5 28,12 16,28 4,12" fill="url(#gemGrad)" stroke="#064e3b" strokeWidth="1.5" />
      <polygon points="10,5 22,5 19,12 13,12" fill="#a7f3d0" />
      <polygon points="4,12 10,5 13,12" fill="#6ee7b7" />
      <polygon points="22,5 28,12 19,12" fill="#34d399" />
      <polygon points="13,12 19,12 16,28" fill="#10b981" />
      <polygon points="4,12 13,12 16,28" fill="#059669" />
      <polygon points="19,12 28,12 16,28" fill="#047857" />
    </svg>
  ),

  // 2. Strategic Systems
  Citadel: ({ className = 'w-4 h-4', size }: IconProps) => (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      width={size}
      height={size}
    >
      <defs>
        <linearGradient id="citadelGrad" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#78350f" />
        </linearGradient>
      </defs>
      {/* Castle Keep */}
      <path
        d="M6 14H10V27H6V14ZM22 14H26V27H22V14ZM11 10H21V27H11V10Z"
        fill="url(#citadelGrad)"
        stroke="#451a03"
        strokeWidth="1.2"
      />
      {/* Crenellations */}
      <path d="M5 11H11V14H5V11ZM21 11H27V14H21V11ZM10 7H22V10H10V7Z" fill="#fbbf24" stroke="#451a03" strokeWidth="1" />
      {/* Gate Portal */}
      <path d="M14 27V21C14 19.8954 14.8954 19 16 19C17.1046 19 18 19.8954 18 21V27H14Z" fill="#1e1b4b" />
      {/* Banner Spires */}
      <path d="M16 2V7M16 2L19 4.5L16 6" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),

  WorldMap: ({ className = 'w-4 h-4', size }: IconProps) => (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      width={size}
      height={size}
    >
      <defs>
        <radialGradient id="compassGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="60%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#075985" />
        </radialGradient>
      </defs>
      <circle cx="16" cy="16" r="13" fill="url(#compassGrad)" stroke="#0c4a6e" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="10.5" stroke="#bae6fd" strokeWidth="0.8" strokeDasharray="1.5 1.5" />
      {/* Star Pointer */}
      <polygon points="16,5 19,16 16,13 13,16" fill="#ef4444" stroke="#7f1d1d" strokeWidth="0.8" />
      <polygon points="16,27 19,16 16,19 13,16" fill="#f8fafc" stroke="#475569" strokeWidth="0.8" />
      <polygon points="27,16 16,19 19,16 16,13" fill="#f8fafc" stroke="#475569" strokeWidth="0.8" />
      <polygon points="5,16 16,19 13,16 16,13" fill="#f8fafc" stroke="#475569" strokeWidth="0.8" />
      <circle cx="16" cy="16" r="2" fill="#fbbf24" stroke="#78350f" strokeWidth="0.8" />
    </svg>
  ),

  Army: ({ className = 'w-4 h-4', size }: IconProps) => (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      width={size}
      height={size}
    >
      {/* Crossed Blades */}
      <path
        d="M6 26L12 20M12 20L23 9L21 7L10 18L12 20ZM10 18L8 20L4 24L7 27L11 23L13 21"
        fill="#e2e8f0"
        stroke="#0f172a"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M26 26L20 20M20 20L9 9L11 7L22 18L20 20ZM22 18L24 20L28 24L25 27L21 23L19 21"
        fill="#e2e8f0"
        stroke="#0f172a"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M16 10L17.5 13L21 13.5L18.5 16L19 19.5L16 18L13 19.5L13.5 16L11 13.5L14.5 13L16 10Z" fill="#f59e0b" stroke="#78350f" strokeWidth="0.8" />
    </svg>
  ),

  Attack: ({ className = 'w-4 h-4', size }: IconProps) => (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      width={size}
      height={size}
    >
      <defs>
        <linearGradient id="flameGrad" x1="16" y1="4" x2="16" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="30%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#dc2626" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="13" fill="#450a0a" stroke="#dc2626" strokeWidth="1.5" />
      <path
        d="M8 24L24 8M24 8H16M24 8V16"
        stroke="url(#flameGrad)"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="24" cy="8" r="3" fill="#fef08a" />
    </svg>
  ),

  Scout: ({ className = 'w-4 h-4', size }: IconProps) => (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      width={size}
      height={size}
    >
      <circle cx="16" cy="16" r="13" fill="#082f49" stroke="#0ea5e9" strokeWidth="1.5" />
      {/* Spyglass Telescope */}
      <path
        d="M9 23L16 16M16 16L21 11M21 11L25 7L27 9L23 13L18 18L11 25L9 23Z"
        fill="#e0f2fe"
        stroke="#0369a1"
        strokeWidth="1.2"
      />
      <circle cx="21" cy="11" r="5" fill="#38bdf8" fillOpacity="0.4" stroke="#0284c7" strokeWidth="1" />
      <circle cx="20" cy="10" r="1.5" fill="#ffffff" />
    </svg>
  ),

  Defense: ({ className = 'w-4 h-4', size }: IconProps) => (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      width={size}
      height={size}
    >
      <defs>
        <linearGradient id="shieldGrad" x1="8" y1="4" x2="24" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="50%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#082f49" />
        </linearGradient>
      </defs>
      <path
        d="M16 4L6 8V16C6 22 10.5 26.5 16 28C21.5 26.5 26 22 26 16V8L16 4Z"
        fill="url(#shieldGrad)"
        stroke="#bae6fd"
        strokeWidth="1.5"
      />
      <path
        d="M16 7L9 10V16C9 20.5 12 24 16 25C20 24 23 20.5 23 16V10L16 7Z"
        fill="#0369a1"
        stroke="#38bdf8"
        strokeWidth="1"
      />
      <line x1="16" y1="7" x2="16" y2="25" stroke="#bae6fd" strokeWidth="1" />
      <line x1="9" y1="14" x2="23" y2="14" stroke="#bae6fd" strokeWidth="1" />
    </svg>
  ),

  Power: ({ className = 'w-4 h-4', size }: IconProps) => (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      width={size}
      height={size}
    >
      <defs>
        <linearGradient id="zapGrad" x1="10" y1="4" x2="22" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
      </defs>
      <path
        d="M18 4L7 17H16L14 28L25 14H17L18 4Z"
        fill="url(#zapGrad)"
        stroke="#78350f"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M16 6L9 16H15L13.5 24L21.5 14H15.5L16 6Z" fill="#fffbeb" />
    </svg>
  ),

  Crown: ({ className = 'w-4 h-4', size }: IconProps) => (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      width={size}
      height={size}
    >
      <defs>
        <linearGradient id="crownGrad" x1="4" y1="8" x2="28" y2="26" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fde047" />
          <stop offset="60%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#854d0e" />
        </linearGradient>
      </defs>
      <path
        d="M5 24H27L25 12L19 18L16 8L13 18L7 12L5 24Z"
        fill="url(#crownGrad)"
        stroke="#713f12"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="7" cy="11" r="1.8" fill="#ef4444" stroke="#7f1d1d" strokeWidth="0.8" />
      <circle cx="16" cy="7" r="2.2" fill="#38bdf8" stroke="#0369a1" strokeWidth="0.8" />
      <circle cx="25" cy="11" r="1.8" fill="#10b981" stroke="#064e3b" strokeWidth="0.8" />
      <rect x="5" y="24" width="22" height="3" rx="1" fill="#ca8a04" stroke="#713f12" strokeWidth="1" />
    </svg>
  ),
};
