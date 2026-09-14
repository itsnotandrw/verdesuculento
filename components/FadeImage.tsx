'use client';

import { useEffect, useRef, useState } from 'react';
import Image, { type ImageProps } from 'next/image';

// Envuelve next/image para que la foto entre con un fundido + leve zoom-out
// en vez de aparecer de golpe apenas termina de descargar. Revisa
// `complete` en el montaje porque si la imagen ya estaba en caché del
// navegador, el evento `load` puede haber disparado antes de que React
// alcance a engancharse — sin ese chequeo la imagen se queda invisible.
export default function FadeImage({ style, onLoad, ...props }: ImageProps) {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (imgRef.current?.complete) setLoaded(true);
  }, []);

  return (
    <Image
      {...props}
      ref={imgRef}
      onLoad={(e) => {
        setLoaded(true);
        onLoad?.(e);
      }}
      style={{
        ...style,
        opacity: loaded ? 1 : 0,
        transform: `${loaded ? 'scale(1)' : 'scale(1.045)'} ${style?.transform ?? ''}`.trim(),
        transition: 'opacity 0.6s var(--ease-out), transform 0.7s var(--ease-out)',
      }}
    />
  );
}
