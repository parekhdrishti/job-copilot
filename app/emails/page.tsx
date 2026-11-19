import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import SyncButton from "./SyncButton";

const BADGE: Record<string, string> = {
  RECRUITER: "bg-purple-900 text-purple-200",
  OA: "bg-yellow-900 text-yellow-200",
  INTERVIEW: "bg-blue-900 text-blue-200",
  REJECTION: "bg-red-900 text-red-200",
  OFFER: "bg-green-900 text-green-200",
  CONFIRMATION: "bg-gray-700 text-gray-200",
  OTHER: "bg-gray-800 text-gray-400",
};

function formatDate(d: Date) {
  return d.toLocaleString("en-US", {
    timeZone: "America/New_York",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

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

    const emails = await prisma.email.findMany({
    where: { category: { not: "OTHER" } },
    orderBy: { receivedAt: "desc" },
    take: 50,
    include: { application: { select: { company: true, role: true } } },
  });

  return (
    <div>
      <p className="mb-4 text-green-400">Connected as {account.email}</p>
      <SyncButton />
      {emails.length === 0 ? (
        <p className="text-gray-400">No emails synced yet. Click &quot;Sync job emails&quot;.</p>
      ) : (
        <ul className="space-y-3">
          {emails.map((e) => (
            <li key={e.id} className="rounded border p-3">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className={`rounded px-2 py-0.5 text-xs ${BADGE[e.category]}`}>{e.category}</span>
                {e.application && (
                  <span className="rounded bg-green-950 px-2 py-0.5 text-xs text-green-300">
                    {e.application.company}
                  </span>
                )}
                {e.dueAt && (
                  <span className="rounded bg-orange-950 px-2 py-0.5 text-xs text-orange-300">
                    Due {formatDate(e.dueAt)}
                  </span>
                )}
              </div>
              <p className="font-medium">{e.subject}</p>
              <p className="text-sm text-gray-400">{e.sender}</p>
              <p className="mt-1 text-sm text-gray-300">{e.summary}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
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