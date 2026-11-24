import React from 'react';

export const BrandMark: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <rect
      x="1.5"
      y="1.5"
      width="29"
      height="29"
      rx="8"
      className="fill-[#101018] stroke-white/15"
    />
    <path
      d="M8.5 22C8.5 16 13 16 16 16C19 16 23.5 16 23.5 10"
      stroke="url(#sp_grad)"
      strokeWidth="2.4"
      strokeLinecap="round"
    />
    <path
      d="M8.5 10L16 16L23.5 22"
      stroke="#38BDF8"
      strokeOpacity="0.45"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <circle cx="8.5" cy="22" r="2.5" fill="#6366F1" />
    <circle cx="16" cy="16" r="2.8" fill="#8B5CF6" />
    <circle cx="23.5" cy="10" r="2.5" fill="#38BDF8" />
    <defs>
      <linearGradient id="sp_grad" x1="8.5" y1="22" x2="23.5" y2="10" gradientUnits="userSpaceOnUse">
        <stop stopColor="#6366F1" />
        <stop offset="0.5" stopColor="#8B5CF6" />
        <stop offset="1" stopColor="#38BDF8" />
      </linearGradient>
    </defs>
  </svg>
);
