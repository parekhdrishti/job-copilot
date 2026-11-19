import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { addApplication, deleteApplication } from "./actions";
import StatusSelect from "./StatusSelect";

async function ApplicationList() {
  const applications = await prisma.application.findMany({
    orderBy: { createdAt: "desc" },
    // Only fetch the newest score for each application.
    include: {
      matchScores: { orderBy: { createdAt: "desc" }, take: 1, select: { score: true } },
    },
  });

  if (applications.length === 0) {
    return <p className="text-gray-500">No applications yet. Add your first one above.</p>;
  }

  return (
    <ul className="space-y-2">
      {applications.map((app) => (
        <li key={app.id} className="flex items-center justify-between rounded border p-3">
          <div>
            <p className="font-medium">{app.company}</p>
            <p className="text-sm text-gray-500">{app.role}</p>
          </div>
          <div className="flex items-center gap-2">
            <ScoreBadge applicationId={app.id} score={app.matchScores[0]?.score} />
            <StatusSelect id={app.id} status={app.status} />
            <form action={deleteApplication}>
              <input type="hidden" name="id" value={app.id} />
              <button type="submit" className="rounded px-2 py-1 text-xs text-red-400 hover:bg-red-950">
                Delete
              </button>
            </form>
          </div>
        </li>
      ))}
    </ul>
  );
}

function ScoreBadge({ applicationId, score }: { applicationId: number; score?: number }) {
  const href = `/match?applicationId=${applicationId}`;

  if (score === undefined) {
    return (
      <Link href={href} className="rounded px-2 py-1 text-xs text-blue-400 hover:bg-blue-950">
        Score
      </Link>
    );
  }

  const color =
    score >= 75 ? "bg-green-900 text-green-300" : score >= 50 ? "bg-yellow-900 text-yellow-300" : "bg-red-900 text-red-300";

  return (
    <Link href={href} title="Latest match score – click to re-score" className={`rounded px-2 py-1 text-xs font-semibold ${color}`}>
      {score}/100
    </Link>
  );
}

export default function Home() {
  const inputStyle = "rounded border bg-white p-2 text-black placeholder-gray-500";

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="mb-2 text-2xl font-bold">Job Hunt Copilot</h1>
      <nav className="mb-6 flex gap-4 text-sm text-blue-400">
        <Link href="/resume">Resume</Link>
        <Link href="/match">Match score</Link>
        <Link href="/emails">Emails</Link>
      </nav>

      <form action={addApplication} className="mb-8 flex flex-col gap-3">
        <input name="company" placeholder="Company" required className={inputStyle} />
        <input name="role" placeholder="Role" required className={inputStyle} />
        <input name="jobUrl" placeholder="Job URL (optional)" className={inputStyle} />
        <button type="submit" className="rounded bg-blue-600 p-2 text-white">
          Add application
        </button>
      </form>

      <Suspense fallback={<p>Loading...</p>}>
        <ApplicationList />
      </Suspense>
    </main>
  );
}