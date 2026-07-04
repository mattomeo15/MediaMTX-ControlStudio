import React from "react";

interface MediaMtxLogoProps {
  className?: string;
}

export const MediaMtxLogo: React.FC<MediaMtxLogoProps> = ({ className = "h-8 w-auto" }) => {
  return (
    <svg
      viewBox="0 0 500 160"
      className={`${className} select-none`}
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
    >
      {/* "MEDIA" Text - Bold Royal Blue */}
      <text
        x="10"
        y="75"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="900"
        fontSize="82"
        className="fill-[#1b64b7] dark:fill-[#3b82f6]"
        letterSpacing="-2"
      >
        MEDIA
      </text>

      {/* "MTX" Text - Dynamic Cyan */}
      <text
        x="180"
        y="145"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="900"
        fontSize="82"
        className="fill-[#199bbd] dark:fill-[#22d3ee]"
        letterSpacing="-2"
      >
        MTX
      </text>

      {/* Broadcast Signal Wave in Cyan */}
      <g
        transform="translate(375, 40)"
        className="stroke-[#199bbd] dark:stroke-[#22d3ee]"
        strokeWidth="11"
        strokeLinecap="round"
        fill="none"
      >
        {/* Wave 1 - Inner */}
        <path d="M 10,80 A 45,45 0 0,1 45,35" />
        {/* Wave 2 - Middle */}
        <path d="M 10,105 A 75,75 0 0,1 70,25" />
        {/* Wave 3 - Outer */}
        <path d="M 10,130 A 105,105 0 0,1 95,15" />
      </g>
    </svg>
  );
};
