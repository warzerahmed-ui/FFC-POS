import React from 'react';
import { useApp } from '../../context/AppContext';

interface FactoryLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  logoUrlOverride?: string;
  altOverride?: string;
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<FactoryLogoProps['size']>, string> = {
  xs: 'w-7 h-7 rounded-lg text-sm',
  sm: 'w-8 h-8 rounded-xl text-base',
  md: 'w-9 h-9 rounded-xl text-lg',
  lg: 'w-12 h-12 rounded-2xl text-2xl',
  xl: 'w-20 h-20 rounded-[24px] text-4xl',
};

/**
 * Displays the configured factory logo image everywhere (menubar, login, receipts, statements)
 * and falls back cleanly to the branded emblem when no custom logo is uploaded.
 */
export const FactoryLogo: React.FC<FactoryLogoProps> = ({
  size = 'md',
  logoUrlOverride,
  altOverride,
  className = '',
}) => {
  const { factorySettings } = useApp();
  const resolvedLogo = logoUrlOverride !== undefined ? logoUrlOverride : factorySettings.logoUrl;
  const resolvedAlt = altOverride || factorySettings.factoryName;
  const sizeCls = SIZE_CLASSES[size];

  if (resolvedLogo) {
    return (
      <div
        className={`${sizeCls} overflow-hidden bg-white border border-slate-200/80 shadow-xs flex items-center justify-center shrink-0 ${className}`}
      >
        <img
          src={resolvedLogo}
          alt={resolvedAlt}
          className="w-full h-full object-contain p-0.5"
        />
      </div>
    );
  }

  return (
    <div
      className={`${sizeCls} bg-gradient-to-br from-[#0071E3] to-[#1D4ED8] flex items-center justify-center shadow-sm shadow-[#0071E3]/20 text-white shrink-0 ${className}`}
    >
      🍗
    </div>
  );
};
