import Script from "next/script";

// Self-injects a floating bar element — no container div needed.
export function AdsterraSocialBar() {
  return (
    <Script
      id="adsterra-social-bar-script"
      src="https://pl31228456.profitableratecpmnetwork.com/ae/12/ed/ae12ed5bb4439217916059de87febca6.js"
      strategy="lazyOnload"
    />
  );
}
