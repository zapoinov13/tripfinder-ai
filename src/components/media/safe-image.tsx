import { useEffect, useState, type ImgHTMLAttributes } from "react";

import hotel1 from "@/assets/hotel-1.jpg";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src?: string | null | undefined;
  fallback?: string;
};

/** Если remote URL отвалился, подставляем локальный запасной кадр. */
export function SafeImage({ src, fallback = hotel1, alt = "", onError, ...rest }: Props) {
  const [current, setCurrent] = useState(src || fallback);

  useEffect(() => {
    setCurrent(src || fallback);
  }, [src, fallback]);

  return (
    <img
      {...rest}
      src={current || fallback}
      alt={alt}
      onError={(e) => {
        if (current !== fallback) setCurrent(fallback);
        onError?.(e);
      }}
    />
  );
}
