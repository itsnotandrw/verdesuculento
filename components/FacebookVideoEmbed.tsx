interface FacebookVideoEmbedProps {
  url: string;
  title: string;
}

// Plugin oficial de video de Facebook vía iframe simple — no requiere el SDK
// de JS de Facebook ni cookies de sesión para reproducir contenido público.
export default function FacebookVideoEmbed({ url, title }: FacebookVideoEmbedProps) {
  const src = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&width=340&t=0`;

  return (
    <iframe
      src={src}
      title={title}
      style={{ border: 'none', overflow: 'hidden', width: '100%', height: '100%' }}
      scrolling="no"
      allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
      allowFullScreen
      loading="lazy"
    />
  );
}
