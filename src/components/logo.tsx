import Image from "next/image";
import fullLogo from "../../public/brand/full-logo.png";

export function Logo({ className }: { className?: string }) {
  return (
    <Image
      src={fullLogo}
      alt="SinusFlirt"
      priority
      className={className ?? "h-24 w-auto"}
    />
  );
}
