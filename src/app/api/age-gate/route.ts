import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const bodySchema = z.object({
  dob: z.iso.date(),
  tosAccepted: z.literal(true),
});

function calculateAge(dob: Date, now: Date): number {
  let age = now.getFullYear() - dob.getFullYear();
  const hasHadBirthdayThisYear =
    now.getMonth() > dob.getMonth() ||
    (now.getMonth() === dob.getMonth() && now.getDate() >= dob.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid submission." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No session." }, { status: 401 });
  }

  const dob = new Date(parsed.data.dob);
  const now = new Date();
  const age = calculateAge(dob, now);
  const isAdult = age >= 18;

  const admin = createAdminClient();

  const { error: updateError } = await admin.auth.admin.updateUserById(
    user.id,
    {
      app_metadata: isAdult
        ? { age_verified_at: now.toISOString(), underage: false }
        : { underage: true },
    }
  );

  if (updateError) {
    console.error("Failed to set age-verification claim:", updateError.message);
    return NextResponse.json(
      { error: "Could not record age verification." },
      { status: 500 }
    );
  }

  if (isAdult) {
    const { error: accountError } = await admin.from("accounts").upsert({
      id: user.id,
      date_of_birth: parsed.data.dob,
      tos_accepted_at: now.toISOString(),
    });

    if (accountError) {
      console.error("Failed to write account record:", accountError.message);
      return NextResponse.json(
        { error: "Could not save your details." },
        { status: 500 }
      );
    }
  }

  // Refresh the session so the browser's cookie immediately reflects the
  // new app_metadata claim — otherwise middleware won't see it until the
  // access token naturally expires and rotates.
  await supabase.auth.refreshSession();

  return NextResponse.json({ blocked: !isAdult });
}
