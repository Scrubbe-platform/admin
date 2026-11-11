import Image from "next/image";

/** public/blacklogo.png is 6366 × 1690. */
const LOGO_ASPECT = 6366 / 1690;

/** The Scrubbe wordmark, sized by height so its proportions always hold. */
export function Logo({ height, priority = false }: { height: number; priority?: boolean }) {
  return (
    <Image
      src="/blacklogo.png"
      alt="Scrubbe"
      height={height}
      width={Math.round(height * LOGO_ASPECT)}
      priority={priority}
      className="block"
    />
  );
}
