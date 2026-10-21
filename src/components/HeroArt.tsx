import Image from "next/image";
import { Svg } from "@/components/Icon";

/**
 * Decorative hero illustration, built in code around the approved Cloud Edge icon.
 * Inspired by the supplied homepage mockup. It does not alter the logo itself.
 */
const chips = [
  { icon: "code", x: 22, y: 16 },
  { icon: "upload", x: 72, y: 8 },
  { icon: "cart", x: 8, y: 46 },
  { icon: "globe", x: 84, y: 38 },
  { icon: "shield", x: 80, y: 72 },
];

// Deterministic "random" points for the network background.
function points(n: number) {
  const pts: [number, number][] = [];
  let s = 7;
  for (let i = 0; i < n; i++) {
    s = (s * 9301 + 49297) % 233280; const x = 40 + (s / 233280) * 60;
    s = (s * 9301 + 49297) % 233280; const y = (s / 233280) * 90;
    pts.push([x, y]);
  }
  return pts;
}

export default function HeroArt() {
  const pts = points(34);
  const links: [number, number, number, number][] = [];
  pts.forEach((a, i) => pts.slice(i + 1).forEach((b) => { if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 14) links.push([a[0], a[1], b[0], b[1]]); }));
  const cx = 50, cy = 42;
  return (
    <div className="hero-art" aria-hidden="true">
      <svg className="net" viewBox="0 0 100 90" preserveAspectRatio="none">
        <defs>
          <radialGradient id="halo" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#19c3ff" stopOpacity=".35" /><stop offset="1" stopColor="#0b66f5" stopOpacity="0" /></radialGradient>
          <linearGradient id="ring" x1="0" x2="1"><stop offset="0" stopColor="#0b66f5" stopOpacity="0" /><stop offset=".5" stopColor="#19c3ff" /><stop offset="1" stopColor="#0b66f5" stopOpacity="0" /></linearGradient>
        </defs>
        <g stroke="#5aa8ff" strokeOpacity=".22" strokeWidth=".15">
          {links.map((l, i) => <line key={i} x1={l[0]} y1={l[1]} x2={l[2]} y2={l[3]} />)}
        </g>
        <g fill="#7fdcff">
          {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={i % 5 === 0 ? 0.55 : 0.32} opacity={i % 3 === 0 ? 0.9 : 0.5} />)}
        </g>
        <ellipse className="glow" cx={cx} cy={cy} rx="34" ry="34" fill="url(#halo)" />
        <g fill="none" stroke="#3d8bff" strokeOpacity=".7" strokeWidth=".3" strokeDasharray="1 .8">
          {chips.map((c) => {
            const x = c.x + 6.75, y = c.y + 6.75;
            const midX = (x + cx) / 2;
            return <path key={c.icon} d={`M${x} ${y} L${midX} ${y} L${midX} ${cy} L${cx} ${cy}`} />;
          })}
        </g>
        <ellipse cx={cx} cy="74" rx="24" ry="3.4" fill="none" stroke="url(#ring)" strokeWidth=".5" />
        <ellipse cx={cx} cy="74" rx="15" ry="2" fill="none" stroke="url(#ring)" strokeWidth=".35" opacity=".7" />
        <ellipse cx={cx} cy="74" rx="10" ry="1.4" fill="#19c3ff" opacity=".25" />
      </svg>
      <Image className="mark" src="/brand/icon-512.png" alt="" width={512} height={512} priority sizes="(max-width: 900px) 40vw, 260px" />
      {chips.map((c) => (
        <span key={c.icon} className="chip" style={{ left: `${c.x}%`, top: `${(c.y / 90) * 100}%` }}><Svg name={c.icon} /></span>
      ))}
    </div>
  );
}
