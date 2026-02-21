interface AvatarProps {
  src?: string | null;
  alt: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClass = { sm: 'w-8 h-8 text-sm', md: 'w-10 h-10 text-base', lg: 'w-14 h-14 text-xl' };

export function Avatar({ src, alt, size = 'md', className = '' }: AvatarProps) {
  const s = sizeClass[size];
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className={`rounded-full object-cover ${s} ${className}`}
      />
    );
  }
  const initial = alt.slice(0, 1).toUpperCase();
  return (
    <div
      className={`flex items-center justify-center rounded-full bg-gray-400 text-white font-medium ${s} ${className}`}
    >
      {initial}
    </div>
  );
}
