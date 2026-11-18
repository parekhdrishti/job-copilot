import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { addApplication, deleteApplication } from "./actions";
import StatusSelect from "./StatusSelect";

async function ApplicationList() {
  const applications = await prisma.application.findMany({
    orderBy: { createdAt: "desc" },
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

export default function Home() {
  const inputStyle = "rounded border bg-white p-2 text-black placeholder-gray-500";

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="mb-6 text-2xl font-bold">Job Hunt Copilot</h1>

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