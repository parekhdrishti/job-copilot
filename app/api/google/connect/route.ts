import { NextResponse } from "next/server";
import { createOAuthClient } from "@/lib/google";

export async function GET() {
  const state = crypto.randomUUID();

  const url = createOAuthClient().generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/gmail.readonly"],
    state,
  });

  const res = NextResponse.redirect(url);
  res.cookies.set("g_state", state, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return res;
}