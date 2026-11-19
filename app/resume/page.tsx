import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { saveResume } from "../match/actions";

async function ResumeStatus() {
  const resume = await prisma.resume.findFirst({ orderBy: { createdAt: "desc" } });
  return resume ? (
    <p className="mb-4 text-green-400">
      Resume saved ({resume.text.length} characters). Saving again replaces it for scoring.
    </p>
  ) : (
    <p className="mb-4 text-gray-400">No resume saved yet.</p>
  );
}

export default function ResumePage() {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <Link href="/" className="text-sm text-blue-400">← Back to tracker</Link>
      <h1 className="mb-6 mt-2 text-2xl font-bold">Your resume</h1>

      <Suspense fallback={<p>Loading...</p>}>
        <ResumeStatus />
      </Suspense>

      <form action={saveResume} className="flex flex-col gap-3">
        <textarea
          name="text"
          rows={16}
          required
          placeholder="Paste your resume text here..."
          className="rounded border bg-white p-2 text-black placeholder-gray-500"
        />
        <button type="submit" className="rounded bg-blue-600 p-2 text-white">
          Save resume
        </button>
      </form>
    </main>
  );
}