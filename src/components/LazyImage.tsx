import { useState } from "react";
import { imageSrcSet } from "@/lib/images";

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
  priority?: boolean;
  decoding?: "async" | "sync" | "auto";
}

const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt = "Image",
  fallbackSrc = "/placeholder.svg",
  priority = false,
  decoding = "async",
  srcSet,
  sizes,
  ...props
}) => {
  const [failedSrc, setFailedSrc] = useState<string | undefined>();
  const failed = !!src && failedSrc === src;
  // Optimized property photos get an 800 px copy for small screens
  const responsiveSrcSet = failed ? undefined : srcSet ?? imageSrcSet(src);

  return (
    <img
      {...props}
      src={failed || !src ? fallbackSrc : src}
      srcSet={responsiveSrcSet}
      sizes={responsiveSrcSet ? sizes ?? "100vw" : sizes}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding={decoding}
      onError={() => setFailedSrc(src)}
      className={props.className || "object-cover w-full h-full"}
    />
  );
};

export default LazyImage;
