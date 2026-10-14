type IconProps = { className?: string; size?: number };

export function GridIcon({ className, size = 12 }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" />
      <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
    </svg>
  );
}

// Duas folhas sobrepostas.
export function CarouselIcon({ className, size = 18 }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <rect x="8" y="3" width="13" height="13" rx="3" />
      <path d="M6 7.2A3 3 0 0 0 3 10v8a3 3 0 0 0 3 3h8a3 3 0 0 0 2.8-2H9a3 3 0 0 1-3-3Z" />
    </svg>
  );
}

// Play dentro de um quadrado arredondado.
export function ReelsIcon({ className, size = 18 }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      fillRule="evenodd"
      aria-hidden="true"
    >
      <path d="M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4Zm3 5.3v7.4a.6.6 0 0 0 .9.5l6.2-3.7a.6.6 0 0 0 0-1L10.9 7.8a.6.6 0 0 0-.9.5Z" />
    </svg>
  );
}

export function ChevronIcon({
  className,
  size = 24,
  direction,
}: IconProps & { direction: "left" | "right" }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={direction === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
    </svg>
  );
}

// Um X.
export function CloseIcon({ className, size = 24 }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}
