"use client";

import { useActionState } from "react";
import { syncEmails, type SyncState } from "./actions";

export default function SyncButton() {
  const [state, formAction, pending] = useActionState(syncEmails, {} as SyncState);

  return (
    <form action={formAction} className="mb-6">
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {pending ? "Syncing..." : "Sync job emails"}
      </button>
      {state.message && <p className="mt-2 text-sm text-green-400">{state.message}</p>}
      {state.error && <p className="mt-2 text-sm text-red-400">{state.error}</p>}
    </form>
  );
}