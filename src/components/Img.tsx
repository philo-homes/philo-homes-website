'use client'

import Image from 'next/image'

// Remote product photo rendered through next/image (resized + WebP) with a
// plain <img> fallback for anything that isn't an http(s) URL.
export default function Img({ src, alt = '', className = '', sizes = '(max-width: 768px) 50vw, 25vw', priority = false }: { src: string; alt?: string; className?: string; sizes?: string; priority?: boolean }) {
  if (!src) return null
  if (!/^https?:\/\//.test(src)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className={className} />
  }
  return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className={className} style={{ objectFit: 'cover' }} />
}
