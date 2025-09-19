import { useState } from "react";

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string; // 👈 används om bilden inte kan laddas
  priority?: boolean;   // 👈 för hero-bilder som ska laddas direkt
}

const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt = "Image",
  fallbackSrc = "/placeholder.jpg",
  priority = false,
  ...props
}) => {
  const [imgSrc, setImgSrc] = useState(src || fallbackSrc);

  return (
    <img
      {...props}
      src={imgSrc}
      alt={alt}
      loading={priority ? "eager" : "lazy"} // 👈 snabb-laddning för viktiga bilder
      onError={() => setImgSrc(fallbackSrc)} // 👈 fallback aktiveras vid fel
      className={props.className || "object-cover w-full h-full"}
    />
  );
};

export default LazyImage;
