export interface VercelIconProps {
  size?: number;
}

export function VercelIcon({ size = 20 }: VercelIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M 12 2 L 22 19 L 2 19 Z" fill="currentColor" stroke="none" />
    </svg>
  );
}
