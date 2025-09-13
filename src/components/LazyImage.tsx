import React, { useState, useCallback, memo } from 'react';
import { cn } from '@/lib/utils';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  loading?: 'eager' | 'lazy';
  priority?: boolean;
  placeholder?: string;
  onLoad?: () => void;
  onError?: () => void;
}

const LazyImage = memo(({ 
  src, 
  alt, 
  className, 
  width, 
  height, 
  loading = 'lazy',
  priority = false,
  placeholder = '/placeholder.svg',
  onLoad,
  onError 
}: LazyImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(priority ? src : placeholder);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setHasError(true);
    setCurrentSrc(placeholder);
    onError?.();
  }, [onError, placeholder]);

  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    const [entry] = entries;
    if (entry.isIntersecting && !isLoaded && !hasError && currentSrc === placeholder) {
      setCurrentSrc(src);
    }
  }, [src, isLoaded, hasError, currentSrc, placeholder]);

  React.useEffect(() => {
    if (priority || loading === 'eager') return;

    const observer = new IntersectionObserver(handleIntersection, {
      threshold: 0.1,
      rootMargin: '50px',
    });

    const element = document.querySelector(`img[alt="${alt}"]`);
    if (element) {
      observer.observe(element);
    }

    return () => observer.disconnect();
  }, [handleIntersection, alt, priority, loading]);

  // Generate srcset for responsive images
  const generateSrcSet = (src: string) => {
    if (!src || src === placeholder) return '';
    
    const baseUrl = src.split('?')[0];
    const params = src.includes('?') ? '&' + src.split('?')[1] : '';
    
    return [
      `${baseUrl}?width=480${params} 480w`,
      `${baseUrl}?width=768${params} 768w`,
      `${baseUrl}?width=1024${params} 1024w`,
      `${baseUrl}?width=1280${params} 1280w`,
      `${baseUrl}?width=1920${params} 1920w`,
    ].join(', ');
  };

  return (
    <img
      src={currentSrc}
      srcSet={generateSrcSet(currentSrc)}
      sizes="(max-width: 480px) 100vw, (max-width: 768px) 100vw, (max-width: 1024px) 100vw, 1280px"
      alt={alt}
      width={width}
      height={height}
      loading={loading}
      className={cn(
        'transition-all duration-300 ease-smooth',
        isLoaded && currentSrc !== placeholder ? 'opacity-100' : 'opacity-75',
        hasError && 'filter grayscale',
        className
      )}
      onLoad={handleLoad}
      onError={handleError}
      decoding="async"
    />
  );
});

LazyImage.displayName = 'LazyImage';

export default LazyImage;