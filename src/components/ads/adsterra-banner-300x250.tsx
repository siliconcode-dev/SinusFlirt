import Script from "next/script";

// Only one atOptions-based Banner unit renders at a time app-wide — these
// units share a single global `atOptions` variable that a second unit would
// clobber before the first's invoke.js reads it, so 320x50/728x90 are held
// back rather than risking both on the same page. Revisit if a genuinely
// separate placement needs a different size later.
export function AdsterraBanner300x250() {
  return (
    <>
      <Script id="adsterra-banner-300x250-options" strategy="lazyOnload">
        {`atOptions = {
          'key' : 'f6d9ea620e4af28bc0ba462c79547e9a',
          'format' : 'iframe',
          'height' : 250,
          'width' : 300,
          'params' : {}
        };`}
      </Script>
      <Script
        id="adsterra-banner-300x250-invoke"
        src="https://www.highrevenueformat.com/f6d9ea620e4af28bc0ba462c79547e9a/invoke.js"
        strategy="lazyOnload"
      />
    </>
  );
}
