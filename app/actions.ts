"use server";

import { revalidatePath } from "next/cache";
import { ApplicationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function addApplication(formData: FormData) {
  const company = String(formData.get("company") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();
  const jobUrl = String(formData.get("jobUrl") ?? "").trim();

  if (!company || !role) return;

  await prisma.application.create({
    data: { company, role, jobUrl: jobUrl || null },
  });

  revalidatePath("/");
}

export async function updateStatus(formData: FormData) {
  const id = Number(formData.get("id"));
  const status = String(formData.get("status"));

  if (!Object.values(ApplicationStatus).includes(status as ApplicationStatus)) return;

  await prisma.application.update({
    where: { id },
    data: { status: status as ApplicationStatus },
  });

  revalidatePath("/");
}

export async function deleteApplication(formData: FormData) {
  const id = Number(formData.get("id"));

  await prisma.application.delete({ where: { id } });

  revalidatePath("/");
}