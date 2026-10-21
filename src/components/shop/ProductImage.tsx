/* eslint-disable @next/next/no-img-element -- product images are SVG/uploaded files served as-is; plain <img> keeps them crisp and cacheable */
export default function ProductImage({ src, alt, eager = false, className }: { src: string; alt: string; eager?: boolean; className?: string }) {
  return <img src={src} alt={alt} width={800} height={600} loading={eager ? "eager" : "lazy"} decoding="async" className={className} />;
}
