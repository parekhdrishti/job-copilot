"use server";

import OpenAI from "openai";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export type MatchState = {
  error?: string;
  saved?: boolean;
  result?: {
    score: number;
    summary: string;
    strengths: string[];
    gaps: string[];
    suggestions: string[];
  };
};

export async function saveResume(formData: FormData) {
  const text = String(formData.get("text") ?? "").trim();
  if (!text) return;

  await prisma.resume.create({ data: { text } });
  revalidatePath("/resume");
}

export async function analyzeMatch(
  _prev: MatchState,
  formData: FormData
): Promise<MatchState> {
  // Empty means "don't save to an application" – the score is only shown, not stored.
  const applicationId = Number(formData.get("applicationId")) || null;
  const jobDescription = String(formData.get("jobDescription") ?? "").trim();
  if (!jobDescription) return { error: "Paste a job description first." };

  if (!process.env.OPENAI_API_KEY) {
    return { error: "OPENAI_API_KEY is missing from .env (restart the dev server after adding it)." };
  }

  const resume = await prisma.resume.findFirst({ orderBy: { createdAt: "desc" } });
  if (!resume) return { error: "Save your resume first on the Resume page." };

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a candid recruiter. Compare the resume to the job description. " +
            "Reply with JSON only, using exactly these keys: " +
            "score (integer 0-100), summary (2 sentences), strengths (array of short strings), " +
            "gaps (array of short strings: skills or keywords the job wants that the resume lacks), " +
            "suggestions (array of short, concrete resume edits). Do not invent experience.",
        },
        {
          role: "user",
          content: `RESUME:\n${resume.text.slice(0, 12000)}\n\nJOB DESCRIPTION:\n${jobDescription.slice(0, 12000)}`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const data = JSON.parse(raw);

    const result = {
      score: Math.max(0, Math.min(100, Math.round(Number(data.score) || 0))),
      summary: String(data.summary ?? ""),
      strengths: Array.isArray(data.strengths) ? data.strengths.map(String) : [],
      gaps: Array.isArray(data.gaps) ? data.gaps.map(String) : [],
      suggestions: Array.isArray(data.suggestions) ? data.suggestions.map(String) : [],
    };

    // Save the score to the chosen application (and resume version) so the tracker can show it.
    let saved = false;
    if (applicationId) {
      await prisma.matchScore.create({
        data: { ...result, applicationId, resumeId: resume.id, jobDescription },
      });
      revalidatePath("/");
      saved = true;
    }

    return { result, saved };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: `Scoring failed: ${message}` };
  }
}