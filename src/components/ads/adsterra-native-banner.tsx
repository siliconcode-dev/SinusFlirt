import Script from "next/script";

// Phase 7: passive, general-site monetization (Masterdoc §8 staged exception
// — Adsterra while AdSense verification is pending). Not wired to the
// premium-unlock mechanic; see src/lib/monetization/.
export function AdsterraNativeBanner() {
  return (
    <>
      <Script
        id="adsterra-native-banner-script"
        src="https://pl31228455.profitableratecpmnetwork.com/89a1abe064d2e4a2f382162328585529/invoke.js"
        strategy="lazyOnload"
        data-cfasync="false"
        async
      />
      <div id="container-89a1abe064d2e4a2f382162328585529" />
    </>
  );
}
