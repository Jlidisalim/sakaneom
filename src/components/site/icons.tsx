// Pure presentational SVG icons for the public site. Extracted from shell.tsx to
// keep that file focused on layout/state. All are decorative (aria-hidden); the
// interactive element that wraps them carries the accessible label.

type IconProps = { className?: string };

export function IconPhone({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 4h3l2 5-2.5 1.5a11 11 0 0 0 5 5L14 13l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
    </svg>
  );
}

export function IconMail({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

export function IconPin({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

export function IconInstagram({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.7" fill="currentColor" />
    </svg>
  );
}

export function IconFacebook({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M13 22v-8h3l1-4h-4V7.5c0-1.1.4-1.5 1.5-1.5H17V2.2C16.6 2.1 15.4 2 14.2 2 11.7 2 10 3.5 10 6.2V10H7v4h3v8h3z" />
    </svg>
  );
}

export function IconWhatsApp({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.4A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-2.9.8.8-2.8-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.4-.7-1.7-.8s-.4-.1-.5.1-.6.8-.8 1-.3.2-.6.1a6.7 6.7 0 0 1-2-1.2 7.4 7.4 0 0 1-1.3-1.7c-.1-.2 0-.4.1-.5l.4-.5.2-.4a.5.5 0 0 0 0-.4L9 6.6c-.2-.5-.4-.4-.5-.4h-.5a1 1 0 0 0-.7.3 2.9 2.9 0 0 0-.9 2.2 5 5 0 0 0 1.1 2.7 11.3 11.3 0 0 0 4.3 3.8c1.6.7 2.2.6 2.9.5a2.5 2.5 0 0 0 1.7-1.2 2.1 2.1 0 0 0 .1-1.2c-.1-.1-.3-.2-.5-.3Z" />
    </svg>
  );
}
