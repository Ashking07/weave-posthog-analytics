import Image from "next/image";

export function Avatar({ src, alt, size = 28 }: { src: string; alt: string; size?: number }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      className="rounded-full ring-1 ring-white dark:ring-zinc-800"
    />
  );
}
