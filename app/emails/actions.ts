"use server";

import { ApplicationStatus } from "@prisma/client";
import OpenAI from "openai";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getGmail } from "@/lib/google";

export type SyncState = { message?: string; error?: string };

const CATEGORIES = ["RECRUITER", "OA", "INTERVIEW", "REJECTION", "OFFER", "CONFIRMATION", "OTHER"] as const;
type Category = (typeof CATEGORIES)[number];

// Edit this Gmail search to change which emails get pulled in.
const QUERY =
  'newer_than:60d -category:promotions -category:social -category:forums (application OR applied OR interview OR recruiter OR "online assessment" OR assessment OR "thank you for applying" OR candidate OR hiring OR "job offer" OR "next steps")';

async function relinkEmails() {
  const [applications, unlinked] = await Promise.all([
    prisma.application.findMany({ select: { id: true, company: true } }),
    prisma.email.findMany({
      where: { applicationId: null },
      select: { id: true, sender: true, subject: true, company: true },
    }),
  ]);

  for (const e of unlinked) {
    const haystack = `${e.sender} ${e.subject} ${e.company ?? ""}`.toLowerCase();
    const match = applications.find(
      (a) => a.company.trim().length >= 3 && haystack.includes(a.company.trim().toLowerCase())
    );
    if (match) {
      await prisma.email.update({ where: { id: e.id }, data: { applicationId: match.id } });
    }
  }
}
const ACTIVE = ["SAVED", "APPLIED", "OA", "INTERVIEW"];
const RANK: Record<string, number> = { SAVED: 0, APPLIED: 1, OA: 2, INTERVIEW: 3, OFFER: 4 };
const CATEGORY_TO_STATUS: Record<string, string> = {
  CONFIRMATION: "APPLIED",
  OA: "OA",
  INTERVIEW: "INTERVIEW",
  OFFER: "OFFER",
  REJECTION: "REJECTED",
};

async function updateStatuses() {
  const apps = await prisma.application.findMany({
    where: { emails: { some: {} } },
    include: {
      emails: { select: { category: true }, orderBy: { receivedAt: "asc" } },
    },
  });

  for (const app of apps) {
    let status: string = app.status;

    for (const e of app.emails) {
      const target = CATEGORY_TO_STATUS[e.category];
      if (!target) continue;
      if (!ACTIVE.includes(status)) break;
      if (target === "REJECTED" || RANK[target] > RANK[status]) status = target;
    }

    if (status !== app.status) {
      await prisma.application.update({
        where: { id: app.id },
        data: { status: status as ApplicationStatus },
      });
    }
  }
}
export async function syncEmails(_prev: SyncState, _formData: FormData): Promise<SyncState> {
  if (!process.env.OPENAI_API_KEY) {
    return { error: "OPENAI_API_KEY is missing from .env (restart the server after adding it)." };
  }

  const account = await prisma.googleAccount.findFirst();
    if (!account) return { error: "Connect Gmail first." };

  await relinkEmails();
  await updateStatuses();

  try {
    const gmail = getGmail(account.refreshToken);
    const list = await gmail.users.messages.list({ userId: "me", maxResults: 25, q: QUERY });
    const ids = (list.data.messages ?? []).map((m) => m.id!).filter(Boolean);
    if (ids.length === 0) return { message: "No job-related emails found in the last 30 days." };

    const existing = await prisma.email.findMany({
      where: { gmailId: { in: ids } },
      select: { gmailId: true },
    });
    const seen = new Set(existing.map((e) => e.gmailId));
    const newIds = ids.filter((id) => !seen.has(id));
    if (newIds.length === 0) return { message: "Already up to date. No new job-related emails." };

    const emails = await Promise.all(
      newIds.map(async (id) => {
        const full = await gmail.users.messages.get({
          userId: "me",
          id,
          format: "metadata",
          metadataHeaders: ["From", "Subject"],
        });
        const header = (name: string) =>
          full.data.payload?.headers?.find((h) => h.name === name)?.value ?? "";
        return {
          gmailId: id,
          sender: header("From"),
          subject: header("Subject") || "(no subject)",
          snippet: full.data.snippet ?? "",
          receivedAt: new Date(Number(full.data.internalDate) || Date.now()),
        };
      })
    );

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const today = new Date().toISOString().slice(0, 10);

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            `You classify job-search emails. Today is ${today}; the user is in America/New_York. ` +
            `Reply with JSON only: {"results":[{"index":number,"category":string,"summary":string,"company":string|null,"dueAt":string|null}]}. ` +
            `category must be one of ${CATEGORIES.join(", ")} (CONFIRMATION = application received; OTHER = not job related or a newsletter). ` +
            `summary is one short sentence. company is the hiring company if clear, else null. ` +
            `dueAt is an ISO 8601 date-time with timezone offset ONLY if the email states a specific deadline or interview time, otherwise null. ` +
            `You only see the subject and a short snippet, so never guess dates. Return one result per email.`,
        },
        {
          role: "user",
          content: JSON.stringify(
            emails.map((e, index) => ({
              index,
              from: e.sender,
              subject: e.subject,
              snippet: e.snippet.slice(0, 400),
            }))
          ),
        },
      ],
    });

    const parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
    const results: Array<Record<string, unknown>> = Array.isArray(parsed.results) ? parsed.results : [];

    const applications = await prisma.application.findMany({ select: { id: true, company: true } });

    const rows = emails.map((e, index) => {
      const r = results.find((x) => Number(x.index) === index) ?? {};
      const category = CATEGORIES.includes(r.category as Category) ? (r.category as Category) : "OTHER";
      const company = typeof r.company === "string" && r.company.trim() ? r.company.trim() : null;
      const due = typeof r.dueAt === "string" ? new Date(r.dueAt) : null;

      const haystack = `${e.sender} ${e.subject} ${company ?? ""}`.toLowerCase();
      const match = applications.find(
        (a) => a.company.trim().length >= 3 && haystack.includes(a.company.trim().toLowerCase())
      );

      return {
        ...e,
        category,
        summary: typeof r.summary === "string" ? r.summary : "",
        company,
        dueAt: due && !isNaN(due.getTime()) ? due : null,
        applicationId: match?.id ?? null,
      };
    });

      await prisma.email.createMany({ data: rows, skipDuplicates: true });
    await updateStatuses();
    revalidatePath("/emails");
    revalidatePath("/");

    const useful = rows.filter((r) => r.category !== "OTHER").length;
    return { message: `Synced ${rows.length} new emails (${useful} look job-related).` };
  } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
    return { error: `Sync failed: ${message}` };
  }
}