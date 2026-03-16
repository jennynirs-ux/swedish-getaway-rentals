import { useState } from "react";

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
  priority?: boolean;
  decoding?: "async" | "sync" | "auto";
  generateSrcSet?: boolean;
}

/**
 * Generate srcSet from Supabase storage URL with width transforms
 * Supports multiple widths for responsive images
 */
const generateSupabaseSrcSet = (src: string): string => {
  if (!src || !src.includes('supabase') || !src.includes('storage')) {
    return src;
  }

  // If already has query params, append to existing ones
  const separator = src.includes('?') ? '&' : '?';

  // Generate srcSet for common breakpoints
  const widths = [320, 640, 1024, 1280, 1920];
  return widths
    .map(width => `${src}${separator}width=${width} ${width}w`)
    .join(', ');
};

const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt = "Image",
  fallbackSrc = "/placeholder.jpg",
  priority = false,
  decoding = "async",
  generateSrcSet = true,
  sizes,
  ...props
}) => {
  const [imgSrc, setImgSrc] = useState(src || fallbackSrc);

  // Generate srcSet if enabled and src is a Supabase URL
  const srcSet = generateSrcSet && imgSrc && imgSrc.includes('supabase')
    ? generateSupabaseSrcSet(imgSrc)
    : undefined;

  // Default sizes for responsive images if not provided
  const defaultSizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw";

  return (
    <img
      {...props}
      src={imgSrc}
      srcSet={srcSet}
      sizes={sizes || defaultSizes}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding={decoding}
      onError={() => setImgSrc(fallbackSrc)}
      className={props.className || "object-cover w-full h-full"}
    />
  );
};

export default LazyImage;
