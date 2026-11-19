"use client";

import { useActionState } from "react";
import { analyzeMatch, type MatchState } from "./actions";

const initial: MatchState = {};

type ApplicationOption = { id: number; company: string; role: string };

export default function MatchForm({
  applications,
  defaultApplicationId,
}: {
  applications: ApplicationOption[];
  defaultApplicationId?: number;
}) {
  const [state, formAction, pending] = useActionState(analyzeMatch, initial);

  return (
    <div>
      <form action={formAction} className="flex flex-col gap-3">
        <select
          name="applicationId"
          defaultValue={defaultApplicationId ?? ""}
          className="rounded border bg-white p-2 text-black"
        >
          <option value="">Don&apos;t save to an application</option>
          {applications.map((app) => (
            <option key={app.id} value={app.id}>
              {app.company} – {app.role}
            </option>
          ))}
        </select>
        <textarea
          name="jobDescription"
          rows={10}
          required
          placeholder="Paste the job description here..."
          className="rounded border bg-white p-2 text-black placeholder-gray-500"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-blue-600 p-2 text-white disabled:opacity-50"
        >
          {pending ? "Analyzing..." : "Score my resume"}
        </button>
      </form>

      {state.error && <p className="mt-4 text-red-400">{state.error}</p>}

      {state.result && (
        <div className="mt-6 space-y-4">
          <p className="text-4xl font-bold">{state.result.score}/100</p>
          {state.saved && <p className="text-sm text-green-400">Saved to your application.</p>}
          <p>{state.result.summary}</p>
          <Section title="Strengths" items={state.result.strengths} />
          <Section title="Gaps" items={state.result.gaps} />
          <Section title="Suggested edits" items={state.result.suggestions} />
        </div>
      )}
    </div>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h2 className="mb-1 font-semibold">{title}</h2>
      <ul className="list-disc space-y-1 pl-5 text-gray-300">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
