function Icon({ children }) {
  return (
    <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

export function IconPlay() {
  return (
    <Icon>
      <polygon points="7 5 18 12 7 19" />
    </Icon>
  );
}

export function IconPause() {
  return (
    <Icon>
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </Icon>
  );
}

export function IconSkipBack() {
  return (
    <Icon>
      <polygon points="18 6 9 12 18 18" />
      <line x1="6" x2="6" y1="6" y2="18" />
    </Icon>
  );
}

export function IconSkipForward() {
  return (
    <Icon>
      <polygon points="6 6 15 12 6 18" />
      <line x1="18" x2="18" y1="6" y2="18" />
    </Icon>
  );
}

export function IconRepeat() {
  return (
    <Icon>
      <path d="m17 2 4 4-4 4" />
      <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
      <path d="m7 22-4-4 4-4" />
      <path d="M21 13v1a4 4 0 0 1-4 4H3" />
    </Icon>
  );
}

export function IconMic() {
  return (
    <Icon>
      <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" />
      <path d="M19 11v1a7 7 0 0 1-14 0v-1" />
      <path d="M12 19v3" />
    </Icon>
  );
}

export function IconSquare() {
  return (
    <Icon>
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </Icon>
  );
}

export function IconDownload() {
  return (
    <Icon>
      <path d="M12 4v11" />
      <path d="m7 11 5 5 5-5" />
      <path d="M5 19h14" />
    </Icon>
  );
}

export function IconRotateCcw() {
  return (
    <Icon>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </Icon>
  );
}
