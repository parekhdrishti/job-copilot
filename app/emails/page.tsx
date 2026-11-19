import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getGmail } from "@/lib/google";

async function EmailList() {
  const account = await prisma.googleAccount.findFirst();

  if (!account) {
    return (
      <div>
        <p className="mb-4 text-gray-400">Gmail isn&apos;t connected yet.</p>
        <a href="/api/google/connect" className="rounded bg-blue-600 px-4 py-2 text-white">
          Connect Gmail
        </a>
      </div>
    );
  }

  try {
    const gmail = getGmail(account.refreshToken);
    const list = await gmail.users.messages.list({
      userId: "me",
      maxResults: 10,
      q: "newer_than:30d",
    });

    const messages = await Promise.all(
      (list.data.messages ?? []).map(async (m) => {
        const full = await gmail.users.messages.get({
          userId: "me",
          id: m.id!,
          format: "metadata",
          metadataHeaders: ["From", "Subject", "Date"],
        });
        const header = (name: string) =>
          full.data.payload?.headers?.find((h) => h.name === name)?.value ?? "";
        return {
          id: m.id!,
          from: header("From"),
          subject: header("Subject") || "(no subject)",
          snippet: full.data.snippet ?? "",
        };
      })
    );

    return (
      <div>
        <p className="mb-4 text-green-400">Connected as {account.email}</p>
        <ul className="space-y-3">
          {messages.map((m) => (
            <li key={m.id} className="rounded border p-3">
              <p className="font-medium">{m.subject}</p>
              <p className="text-sm text-gray-400">{m.from}</p>
              <p className="mt-1 text-sm text-gray-500">{m.snippet}</p>
            </li>
          ))}
        </ul>
      </div>
    );
  } catch {
    return (
      <div>
        <p className="mb-4 text-red-400">Couldn&apos;t read Gmail.</p>
        <a href="/api/google/connect" className="rounded bg-blue-600 px-4 py-2 text-white">
          Reconnect Gmail
        </a>
      </div>
    );
  }
}

export default function EmailsPage() {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <Link href="/" className="text-sm text-blue-400">← Back to tracker</Link>
      <h1 className="mb-6 mt-2 text-2xl font-bold">Emails</h1>
      <Suspense fallback={<p>Loading...</p>}>
        <EmailList />
      </Suspense>
    </main>
  );
}