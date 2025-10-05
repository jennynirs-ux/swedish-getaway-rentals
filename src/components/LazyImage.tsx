import { useState } from "react";

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
  priority?: boolean;
  decoding?: "async" | "sync" | "auto";
}

const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt = "Image",
  fallbackSrc = "/placeholder.jpg",
  priority = false,
  decoding = "async",
  ...props
}) => {
  const [imgSrc, setImgSrc] = useState(src || fallbackSrc);

  return (
    <img
      {...props}
      src={imgSrc}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding={decoding}
      onError={() => setImgSrc(fallbackSrc)}
      className={props.className || "object-cover w-full h-full"}
    />
  );
};

export default LazyImage;
