
export type IconKind = 'clear' | 'cloudy' | 'overcast' | 'rain' | 'snow' | 'fog' | 'thunder';

export default function WeatherIcon({ kind, size = 28 }: { kind: IconKind; size?: number }) {
  const props = { width: size, height: size, viewBox: '0 0 64 64', fill: 'none' } as any;
  const stroke = 'currentColor';
  const cloud = (
    <>
      <path d="M18 39c-5 0-9 4-9 9s4 9 9 9h28c5 0 9-4 9-9 0-4-3-8-7-9a12 12 0 0 0-12-9c-8 0-11 7-11 9H18z" fill="currentColor"/>
    </>
  );
  if (kind === 'clear') {
    return (
      <svg {...props}>
        <circle cx="32" cy="32" r="12" stroke={stroke} strokeWidth="4"/>
        <g stroke={stroke} strokeWidth="4" strokeLinecap="round">
          <path d="M32 6v8"/><path d="M32 50v8"/>
          <path d="M6 32h8"/><path d="M50 32h8"/>
          <path d="M12 12l6 6"/><path d="M46 46l6 6"/>
          <path d="M52 12l-6 6"/><path d="M12 52l6-6"/>
        </g>
      </svg>
    );
  }
  if (kind === 'cloudy') {
    return (
      <svg {...props}>
        {cloud}
        <circle cx="26" cy="22" r="10" fill="currentColor" opacity="0.7"/>
      </svg>
    );
  }
  if (kind === 'overcast') {
    return (
      <svg {...props}>
        {cloud}
        <rect x="10" y="18" width="44" height="10" rx="5" fill="currentColor" opacity="0.5"/>
      </svg>
    );
  }
  if (kind === 'rain') {
    return (
      <svg {...props}>
        {cloud}
        <g stroke={stroke} strokeWidth="3" strokeLinecap="round" opacity="0.9">
          <path d="M22 54l-4 6"/><path d="M32 54l-4 6"/><path d="M42 54l-4 6"/>
        </g>
      </svg>
    );
  }
  if (kind === 'snow') {
    return (
      <svg {...props}>
        {cloud}
        <g stroke={stroke} strokeWidth="3" strokeLinecap="round" opacity="0.9">
          <circle cx="22" cy="57" r="2" fill={stroke}/>
          <circle cx="32" cy="57" r="2" fill={stroke}/>
          <circle cx="42" cy="57" r="2" fill={stroke}/>
        </g>
      </svg>
    );
  }
  if (kind === 'fog') {
    return (
      <svg {...props}>
        {cloud}
        <g stroke={stroke} strokeWidth="4" strokeLinecap="round" opacity="0.6">
          <path d="M12 54h40"/>
          <path d="M16 60h32"/>
        </g>
      </svg>
    );
  }
  // thunder
  return (
    <svg {...props}>
      {cloud}
      <path d="M30 46l-6 12h8l-4 10 12-16h-8l4-6z" fill="currentColor"/>
    </svg>
  );
}
