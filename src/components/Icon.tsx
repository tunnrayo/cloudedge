/** Simple line icons (24×24, stroke-based). Add new ones to `paths`. */
const paths: Record<string, string> = {
  code: "M8 8l-5 4 5 4M16 8l5 4-5 4M14 4l-4 16",
  globe: "M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c2.8 2.6 4 5.7 4 9s-1.2 6.4-4 9M12 3C9.2 5.6 8 8.7 8 12s1.2 6.4 4 9",
  phone: "M8 2.5h8a1.5 1.5 0 011.5 1.5v16a1.5 1.5 0 01-1.5 1.5H8A1.5 1.5 0 016.5 20V4A1.5 1.5 0 018 2.5zM11 18h2",
  cart: "M3 4h2.2l2.3 11h10.3l2.2-8H6.4M9 20.2h.01M17 20.2h.01",
  cloud: "M7 18.5a4.5 4.5 0 01-.6-8.96A6 6 0 0117.8 9.6 4.5 4.5 0 0117.5 18.5H7z",
  upload: "M7 18.5a4.5 4.5 0 01-.6-8.96A6 6 0 0117.8 9.6 4.5 4.5 0 0117.5 18.5M12 12v8M9 15l3-3 3 3",
  gear: "M12 9a3 3 0 100 6 3 3 0 000-6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 01-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 010-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 014 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 010 4h-.1a1.7 1.7 0 00-1.5 1z",
  layers: "M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5M3 17.5l9 5 9-5",
  box: "M21 8l-9-5-9 5v8l9 5 9-5V8zM3 8l9 5 9-5M12 13v8",
  compass: "M12 3a9 9 0 100 18 9 9 0 000-18zM15.5 8.5l-2 5-5 2 2-5 5-2z",
  shield: "M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6l8-3zM9 12l2 2 4-4",
  lock: "M6 11h12a1 1 0 011 1v8a1 1 0 01-1 1H6a1 1 0 01-1-1v-8a1 1 0 011-1zM8 11V7a4 4 0 018 0v4",
  bulb: "M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0012 3z",
  users: "M16 20v-1.5a3.5 3.5 0 00-3.5-3.5h-5A3.5 3.5 0 004 18.5V20M10 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM20 20v-1.5a3.5 3.5 0 00-2.6-3.4M15.5 4.1a3.5 3.5 0 010 6.8",
  chart: "M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-6",
  doc: "M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5zM14 3v5h5M9 13h6M9 17h6",
  mail: "M4 5h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1zM3.5 6l8.5 7 8.5-7",
  pin: "M12 21s-7-6.1-7-11.5A7 7 0 0112 2.5a7 7 0 017 7C19 14.9 12 21 12 21zM12 12a2.5 2.5 0 100-5 2.5 2.5 0 000 5z",
  id: "M4 5h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1zM8.5 12a2 2 0 100-4 2 2 0 000 4zM5.5 16c.5-1.5 1.6-2.2 3-2.2s2.5.7 3 2.2M14 9.5h4M14 13h3",
  clock: "M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v5l3 2",
  arrow: "M5 12h14M13 6l6 6-6 6",
  check: "M5 12.5l4.5 4.5L19 7.5",
  checkCircle: "M12 3a9 9 0 100 18 9 9 0 000-18zM8 12.5l3 3 5-6",
  search: "M11 4a7 7 0 100 14 7 7 0 000-14zM20 20l-4-4",
  menu: "M4 7h16M4 12h16M4 17h16",
  close: "M6 6l12 12M18 6L6 18",
  info: "M12 3a9 9 0 100 18 9 9 0 000-18zM12 11v5M12 8h.01",
  alert: "M12 3.5l9.5 16.5h-19L12 3.5zM12 10v4.5M12 17.5h.01",
  briefcase: "M4 7h16a1 1 0 011 1v11a1 1 0 01-1 1H4a1 1 0 01-1-1V8a1 1 0 011-1zM9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M3 13h18",
  server: "M4 4h16v6H4zM4 14h16v6H4zM8 7h.01M8 17h.01",
  spark: "M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8",
  external: "M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5",
  download: "M12 4v11M7 10l5 5 5-5M5 20h14",
  logout: "M15 4h4a1 1 0 011 1v14a1 1 0 01-1 1h-4M10 16l-4-4 4-4M6 12h11",
};

export const iconPath = (name: string) => paths[name] ?? paths.spark;

export function Svg({ name, className = "i" }: { name: string; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={paths[name] ?? paths.spark} />
    </svg>
  );
}

/** Icon inside a soft rounded tile. */
export default function Icon({ name, size, tone }: { name: string; size?: "sm"; tone?: "dark" | "plain" }) {
  return (
    <span className={["ico", size, tone].filter(Boolean).join(" ")} aria-hidden="true">
      <Svg name={name} />
    </span>
  );
}
