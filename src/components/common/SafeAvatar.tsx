import React, { useState } from 'react';
import { User } from 'lucide-react';

interface SafeAvatarProps {
  src?: string | null;
  name?: string;
  className?: string;
  alt?: string;
}

export const SafeAvatar: React.FC<SafeAvatarProps> = ({
  src,
  name = 'User',
  className = 'w-10 h-10',
  alt = 'Avatar',
}) => {
  const [hasError, setHasError] = useState(false);

  // Extract initials (e.g. "John Doe" -> "JD", "Partner" -> "P")
  const getInitials = (str: string) => {
    if (!str) return 'U';
    const parts = str.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return str.slice(0, 2).toUpperCase();
  };

  const isValidSrc = src && typeof src === 'string' && src.trim().length > 0 && !hasError;

  if (!isValidSrc) {
    return (
      <div
        className={`${className} rounded-full bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 border border-slate-600/50 flex items-center justify-center text-slate-200 font-bold shadow-inner select-none overflow-hidden shrink-0`}
        title={name}
      >
        {name && name !== 'User' && name !== 'Partner' ? (
          <span className="text-[11px] tracking-wider">{getInitials(name)}</span>
        ) : (
          <User className="w-1/2 h-1/2 text-slate-300 stroke-[2.2]" />
        )}
      </div>
    );
  }

  return (
    <div className={`${className} rounded-full overflow-hidden shrink-0 relative bg-slate-800`}>
      <img
        src={src}
        alt={alt || name}
        className="w-full h-full object-cover"
        onError={() => setHasError(true)}
      />
    </div>
  );
};
