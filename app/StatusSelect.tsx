"use client";

import { updateStatus } from "./actions";

const STATUSES = ["SAVED", "APPLIED", "OA", "INTERVIEW", "OFFER", "REJECTED", "GHOSTED"];

export default function StatusSelect({ id, status }: { id: number; status: string }) {
  return (
    <form action={updateStatus}>
      <input type="hidden" name="id" value={id} />
      <select
        name="status"
        defaultValue={status}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded bg-white p-1 text-xs text-black"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </form>
  );
}