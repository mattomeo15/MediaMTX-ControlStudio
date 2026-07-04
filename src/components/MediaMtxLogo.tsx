import React from "react";
import logoImg from "../assets/images/mediamtx_logo_1783171092849.jpg";

interface MediaMtxLogoProps {
  className?: string;
}

export const MediaMtxLogo: React.FC<MediaMtxLogoProps> = ({ className = "h-8 w-auto" }) => {
  return (
    <img
      src={logoImg}
      alt="MediaMTX Logo"
      className={`${className} select-none object-contain`}
      referrerPolicy="no-referrer"
    />
  );
};
