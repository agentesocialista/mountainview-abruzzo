import { Mountain } from "lucide-react";
import { useState } from "react";

interface PoiImageProps {
  src?: string | null;
  alt: string;
  className?: string;
}

export function PoiImage({ src, alt, className }: PoiImageProps) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <span className={`poi-image-fallback ${className ?? ""}`} aria-label={alt}>
        <Mountain size={28} strokeWidth={1.4} aria-hidden="true" />
      </span>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
