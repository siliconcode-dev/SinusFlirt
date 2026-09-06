import { LegalLayout, LegalSection } from "@/components/legal-layout";

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" updated="draft, pre-launch">
      <LegalSection heading="1. What SinusFlirt is">
        <p>
          SinusFlirt is a voice-driven, anime-style AI companion app. You
          talk to one AI-controlled character; she responds in her own
          voice, remembers your relationship over time, and reacts to how
          you treat her. The romantic ceiling of the experience is a
          scripted kiss cutscene — the app does not produce sexual content
          in any form, at any point, for any reason.
        </p>
      </LegalSection>

      <LegalSection heading="2. Eligibility">
        <p>
          You must be 18 years of age or older to use SinusFlirt. We collect
          your date of birth at your first visit and hard-block access if
          you don&apos;t meet this requirement — this is enforced on our
          servers, not just in your browser.
        </p>
      </LegalSection>

      <LegalSection heading="3. Accounts and your data">
        <p>
          You can use SinusFlirt anonymously without creating an account. If
          you don&apos;t sign in with Google within 48 hours, your
          conversation data and character relationship are silently deleted
          — there is no warning or reminder. Signing in with Google makes
          your progress permanent.
        </p>
      </LegalSection>

      <LegalSection heading="4. Acceptable use">
        <p>
          Every response you receive is automatically screened before it
          reaches you. Attempting to manipulate the character into
          producing content that violates these terms won&apos;t work — the
          system is designed to deflect that in-character rather than
          comply, and repeated abuse of the service may result in your
          access being revoked.
        </p>
      </LegalSection>

      <LegalSection heading="5. Free and premium access">
        <p>
          SinusFlirt is free to use, with usage limits tied to our
          underlying AI provider&apos;s daily capacity. Watching a rewarded
          ad can temporarily extend your usage and/or unlock additional
          characters for a limited time. We do not process payments or
          charge money for anything in this version of the app.
        </p>
      </LegalSection>

      <LegalSection heading="6. Changes to the app or these terms">
        <p>
          SinusFlirt is under active development. Features, characters, and
          these terms may change as the app evolves from an early build
          toward a public release.
        </p>
      </LegalSection>

      <LegalSection heading="7. Contact">
        <p>
          Questions about these terms can be sent to{" "}
          <a
            href="mailto:siliconxcode@gmail.com"
            className="underline underline-offset-4"
          >
            siliconxcode@gmail.com
          </a>
          .
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
