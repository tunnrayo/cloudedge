const paths: Record<string, string> = {
  code: "M8 8l-5 4 5 4M16 8l5 4-5 4M14 5l-4 14",
  globe: "M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18",
  phone: "M8 3h8a1 1 0 011 1v16a1 1 0 01-1 1H8a1 1 0 01-1-1V4a1 1 0 011-1zM11 18h2",
  cart: "M3 4h2l2 11h10l2-8H6M9 20h.01M17 20h.01",
  cloud: "M7 18a4 4 0 01-.5-8 5.5 5.5 0 0110.6 1A3.5 3.5 0 0117 18H7z",
  gear: "M12 9a3 3 0 100 6 3 3 0 000-6zM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2",
};
export default function Icon({ name }: { name: string }) {
  return <span className="ico" aria-hidden="true"><svg viewBox="0 0 24 24"><path d={paths[name] ?? paths.gear} /></svg></span>;
}
