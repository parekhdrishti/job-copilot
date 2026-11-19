import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { createOAuthClient } from "@/lib/google";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const savedState = req.cookies.get("g_state")?.value;

  if (!code || !state || state !== savedState) {
    return new NextResponse("Login was cancelled or failed. Go back to /emails and try again.", {
      status: 400,
    });
  }

  try {
    const client = createOAuthClient();
    const { tokens } = await client.getToken(code);

    if (!tokens.refresh_token) {
      return new NextResponse(
        "Google did not return a refresh token. Remove the app at myaccount.google.com/permissions and connect again.",
        { status: 400 }
      );
    }

    client.setCredentials(tokens);
    const gmail = google.gmail({ version: "v1", auth: client });
    const profile = await gmail.users.getProfile({ userId: "me" });
    const email = profile.data.emailAddress ?? "unknown";

    await prisma.googleAccount.upsert({
      where: { email },
      update: { refreshToken: tokens.refresh_token },
      create: { email, refreshToken: tokens.refresh_token },
    });

    const res = NextResponse.redirect(new URL("/emails", req.nextUrl.origin));
    res.cookies.delete("g_state");
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new NextResponse(`Gmail connection failed: ${message}`, { status: 500 });
  }
}