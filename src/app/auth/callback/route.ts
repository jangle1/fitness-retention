import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  const supabase = await createClient();

  // Exchange OAuth code for session (Google flow)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(`${origin}/login`);
    }
  }

  // At this point we should have a session (either from OAuth or email login)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  // Check if trainer profile exists
  const { data: trainer } = await supabase
    .from("trainers")
    .select("id, google_refresh_token")
    .eq("supabase_auth_id", user.id)
    .single();

  // No trainer profile → onboarding
  if (!trainer) {
    return NextResponse.redirect(`${origin}/onboarding`);
  }

  // Save Google refresh token if available (OAuth flow only)
  const session = (await supabase.auth.getSession()).data.session;
  if (session?.provider_refresh_token && !trainer.google_refresh_token) {
    await supabase
      .from("trainers")
      .update({
        google_refresh_token: session.provider_refresh_token,
        google_calendar_id: "primary",
      })
      .eq("id", trainer.id);
  }

  return NextResponse.redirect(`${origin}/calendar`);
}
