import { LegalLayout, LegalSection } from "@/components/legal-layout";

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" updated="draft, pre-launch">
      <LegalSection heading="1. What we collect">
        <ul className="list-disc space-y-1 pl-5">
          <li>Your date of birth, to enforce the 18+ requirement.</li>
          <li>
            Your voice input (converted to text), your character&apos;s
            responses, and a running summary of your relationship with her
            — not full raw transcripts.
          </li>
          <li>
            A numeric &quot;interest&quot; score tracking how your
            conversations have gone.
          </li>
          <li>
            If you sign in: your Google account email and profile, via
            Google OAuth.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="2. Anonymous by default">
        <p>
          You don&apos;t need an account to use SinusFlirt. Anonymous
          sessions are tied to a temporary identity, not to you personally.
          If you never sign in with Google, everything tied to that session
          is silently and permanently deleted after 48 hours.
        </p>
      </LegalSection>

      <LegalSection heading="3. How your conversations are processed">
        <p>
          Your speech and the character&apos;s replies are processed by
          Groq, our AI infrastructure provider, to transcribe your voice,
          generate responses, and produce spoken audio. Every generated
          response is automatically screened for safety before you see or
          hear it. We&apos;ve enabled Groq&apos;s Zero Data Retention
          setting, meaning Groq does not retain your conversation content
          beyond processing it.
        </p>
      </LegalSection>

      <LegalSection heading="4. What we don't do">
        <p>
          We don&apos;t sell your data. We don&apos;t log or store the
          content of moderation flags. We don&apos;t require payment
          information — this version of SinusFlirt has no payment
          processing at all.
        </p>
      </LegalSection>

      <LegalSection heading="5. Advertising">
        <p>
          Optional rewarded ads (via Google AdSense) can extend your usage
          or unlock additional characters. Watching an ad is always your
          choice — it is never required to use the free tier.
        </p>
      </LegalSection>

      <LegalSection heading="6. Your choices">
        <p>
          Sign in with Google at any point to keep your progress
          permanently. Leave without signing in, and everything is deleted
          within 48 hours automatically — no action required on your part.
        </p>
      </LegalSection>

      <LegalSection heading="7. Contact">
        <p>
          Questions about this policy can be sent to{" "}
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
