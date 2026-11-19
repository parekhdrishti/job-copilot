import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import MatchForm from "./MatchForm";

type SearchParams = Promise<{ applicationId?: string }>;

// Reads from the database and the URL, so with Cache Components it must sit inside <Suspense>.
async function MatchFormLoader({ searchParams }: { searchParams: SearchParams }) {
  const { applicationId } = await searchParams;
  const applications = await prisma.application.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, company: true, role: true },
  });

  const preselected = Number(applicationId);
  const defaultApplicationId = applications.some((a) => a.id === preselected) ? preselected : undefined;

  return <MatchForm applications={applications} defaultApplicationId={defaultApplicationId} />;
}

export default function MatchPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <Link href="/" className="text-sm text-blue-400">← Back to tracker</Link>
      <h1 className="mb-2 mt-2 text-2xl font-bold">Match score</h1>
      <p className="mb-6 text-gray-400">
        Paste a job description to see how well your saved{" "}
        <Link href="/resume" className="text-blue-400">resume</Link> fits it. Pick an application
        to save the score to it.
      </p>

      <Suspense fallback={<p>Loading...</p>}>
        <MatchFormLoader searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
