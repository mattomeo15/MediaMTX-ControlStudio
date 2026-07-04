import React from "react";

interface MediaMtxLogoProps {
  className?: string;
}

export const MediaMtxLogo: React.FC<MediaMtxLogoProps> = ({ className = "h-8 w-auto mr-2" }) => {
  return (
    <img
      src="/mediamtx-logo.png"
      alt="MediaMTX Control Studio Logo"
      className={className}
      referrerPolicy="no-referrer"
    />
  );
};
