interface LogoProps {
  compact?: boolean;
}

export function Logo({ compact = false }: LogoProps) {
  return (
    <div className={`logo ${compact ? "logo--compact" : ""}`}>
      <span className="logo__mark" aria-hidden="true">
        <svg viewBox="0 0 48 48" role="img">
          <circle cx="24" cy="24" r="22" fill="currentColor" />
          <path
            d="M7.5 32.4 18.3 17l6.1 8.6 3.9-5.4 12.2 12.2H7.5Z"
            fill="#f6f1e7"
          />
          <path d="m18.3 17 4.1 5.8-2.4 1.7-2.2-2.1-2.7 3.8-2.4-2.7L18.3 17Z" fill="#d8c7a4" />
          <circle cx="33.8" cy="15.8" r="4.2" fill="#e6b85c" />
        </svg>
      </span>
      <span className="logo__text">
        <strong>MountainView</strong>
        <span>Abruzzo</span>
      </span>
    </div>
  );
}
