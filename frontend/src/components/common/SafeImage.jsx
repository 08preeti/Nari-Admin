import { useEffect, useState } from "react";
import { ImageOff } from "lucide-react";
import { assetUrl } from "../../services/api";

// Image with a placeholder when the URL is empty or fails to load.
export default function SafeImage({
  src,
  alt = "",
  size = 44,
  className = "",
}) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [src]);
  const style = { width: size, height: size };
  const full = assetUrl(src);
  if (!src || broken)
    return (
      <div
        className={`img-ph ${className}`}
        style={style}
        title={src ? "Image could not be loaded" : "No image"}
      >
        <ImageOff size={Math.max(14, size / 3)} />
      </div>
    );
  return (
    <img
      className={`thumb ${className}`}
      style={style}
      src={full}
      alt={alt}
      loading="lazy"
      onError={() => setBroken(true)}
    />
  );
}
