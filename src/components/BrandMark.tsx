export function SafraIcon({className = 'w-8 h-8'}: {className?: string}) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="64" height="64" rx="16" fill="#16532A" />
      <rect x="30" y="16" width="4" height="36" rx="2" fill="#84CC16" />
      {/* Folha superior */}
      <path d="M32 8C36 12.5 36.5 18.5 32 23C27.5 18.5 28 12.5 32 8Z" fill="#A3E635" />
      {/* Par superior */}
      <path d="M31 24C24.5 23.5 19.5 19.5 17 14C23.5 14 28.5 18 31 24Z" fill="#A3E635" />
      <path d="M33 24C39.5 23.5 44.5 19.5 47 14C40.5 14 35.5 18 33 24Z" fill="#A3E635" />
      {/* Par médio */}
      <path d="M31 34C24 33.5 19 29.5 16.5 24C23.5 24 28.5 28 31 34Z" fill="#86EFAC" />
      <path d="M33 34C40 33.5 45 29.5 47.5 24C40.5 24 35.5 28 33 34Z" fill="#86EFAC" />
      {/* Par inferior */}
      <path d="M31 44C24 43.5 19 39.5 16.5 34C23.5 34 28.5 38 31 44Z" fill="#4ADE80" />
      <path d="M33 44C40 43.5 45 39.5 47.5 34C40.5 34 35.5 38 33 44Z" fill="#4ADE80" />
    </svg>
  );
}

export function BrandWordmark({
  dark = true,
  size = 'md',
}: {
  dark?: boolean;
  size?: 'md' | 'lg';
}) {
  const textSize = size === 'lg' ? 'text-xl' : 'text-base';
  return (
    <span
      className={`font-display font-semibold tracking-tight whitespace-nowrap ${textSize} ${
        dark ? 'text-white' : 'text-[#111915]'
      }`}
    >
      safra<span className={dark ? 'text-[#22C55E]' : 'text-[#16A34A]'}>.pro</span>
    </span>
  );
}
