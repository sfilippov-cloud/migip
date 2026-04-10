"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.groupName !== "admin") {
    throw new Error("Unauthorized");
  }
  return session;
}

async function requireAuth() {
  const session = await auth();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function createRule(data: {
  id: number;
  subId: number;
  sectionId: number;
  ruleTypeId: number;
  decisionBodyId: number | null;
  decisionDate: string | null;
  persona: string | null;
  groupId: number;
  text: string;
  categoryIds: number[];
}) {
  await requireAdmin();

  const rule = await prisma.rules.create({
    data: {
      id: data.id,
      sub_id: data.subId,
      section_id: data.sectionId,
      rule_type_id: data.ruleTypeId,
      status_id: 1,
      decision_body_id: data.decisionBodyId,
      decision_date: data.decisionDate ? new Date(data.decisionDate) : null,
      persona: data.persona,
      group_id: data.groupId,
      text: data.text,
    },
  });

  // Insert category mappings
  if (data.categoryIds.length > 0) {
    await prisma.rule_applies_to.createMany({
      data: data.categoryIds.map((catId) => ({
        rule_uid: rule.rule_uid,
        applies_to_id: catId,
      })),
    });
  }

  // Trigger AI embedding
  await triggerAiEmbed(rule.rule_uid);

  revalidatePath("/rules");
  revalidatePath("/personal");
  return rule;
}

export async function createPersonalRule(data: {
  id: number;
  decisionBodyId: number | null;
  decisionDate: string | null;
  persona: string;
  text: string;
  categoryIds: number[];
}) {
  await requireAdmin();

  const rule = await prisma.rules.create({
    data: {
      id: data.id,
      sub_id: 0,
      section_id: 0,
      rule_type_id: 0,
      status_id: 1,
      decision_body_id: data.decisionBodyId,
      decision_date: data.decisionDate ? new Date(data.decisionDate) : null,
      persona: data.persona,
      group_id: 2,
      text: data.text,
    },
  });

  if (data.categoryIds.length > 0) {
    await prisma.rule_applies_to.createMany({
      data: data.categoryIds.map((catId) => ({
        rule_uid: rule.rule_uid,
        applies_to_id: catId,
      })),
    });
  }

  await triggerAiEmbed(rule.rule_uid);

  revalidatePath("/personal");
  return rule;
}

export async function updateRule(
  ruleUid: number,
  data: {
    id: number;
    subId: number;
    decisionBodyId: number | null;
    decisionDate: string | null;
    groupId: number;
    persona: string | null;
    text: string;
    categoryIds: number[];
  }
) {
  await requireAdmin();

  await prisma.rules.update({
    where: { rule_uid: ruleUid },
    data: {
      id: data.id,
      sub_id: data.subId,
      status_id: 1,
      decision_body_id: data.decisionBodyId,
      decision_date: data.decisionDate ? new Date(data.decisionDate) : null,
      group_id: data.groupId,
      persona: data.persona,
      text: data.text,
    },
  });

  // Replace category mappings
  await prisma.rule_applies_to.deleteMany({ where: { rule_uid: ruleUid } });
  if (data.categoryIds.length > 0) {
    await prisma.rule_applies_to.createMany({
      data: data.categoryIds.map((catId) => ({
        rule_uid: ruleUid,
        applies_to_id: catId,
      })),
    });
  }

  // Re-embed
  await prisma.rule_embeddings.deleteMany({ where: { rule_uid: ruleUid } });
  await triggerAiEmbed(ruleUid);

  revalidatePath("/rules");
  revalidatePath("/personal");
}

export async function updatePersonalRule(
  ruleUid: number,
  data: {
    id: number;
    subId: number;
    decisionBodyId: number | null;
    decisionDate: string | null;
    groupId: number;
    text: string;
    categoryIds: number[];
  }
) {
  await requireAdmin();

  await prisma.rules.update({
    where: { rule_uid: ruleUid },
    data: {
      id: data.id,
      sub_id: data.subId,
      status_id: 1,
      decision_body_id: data.decisionBodyId,
      decision_date: data.decisionDate ? new Date(data.decisionDate) : null,
      group_id: data.groupId,
      text: data.text,
    },
  });

  await prisma.rule_applies_to.deleteMany({ where: { rule_uid: ruleUid } });
  if (data.categoryIds.length > 0) {
    await prisma.rule_applies_to.createMany({
      data: data.categoryIds.map((catId) => ({
        rule_uid: ruleUid,
        applies_to_id: catId,
      })),
    });
  }

  await prisma.rule_embeddings.deleteMany({ where: { rule_uid: ruleUid } });
  await triggerAiEmbed(ruleUid);

  revalidatePath("/personal");
}

export async function toggleArchive(ruleUid: number, currentStatusId: number) {
  await requireAdmin();

  const newStatus = currentStatusId === 1 ? 2 : 1;
  await prisma.rules.update({
    where: { rule_uid: ruleUid },
    data: { status_id: newStatus },
  });

  // Re-embed when unarchiving
  if (newStatus === 1) {
    await triggerAiEmbed(ruleUid);
  }

  revalidatePath("/rules");
  revalidatePath("/personal");
}

export async function deleteRule(ruleUid: number) {
  await requireAdmin();

  // Cascade deletes handle rule_applies_to and rule_embeddings
  await prisma.rules.delete({ where: { rule_uid: ruleUid } });

  revalidatePath("/rules");
  revalidatePath("/personal");
}

async function triggerAiEmbed(ruleUid: number) {
  const url = process.env.N8N_AI_EMBED_URL;
  if (!url) return;

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rule_uid: ruleUid }),
    });
  } catch {
    // AI embedding is non-critical; log but don't fail
    console.error(`Failed to trigger AI embed for rule_uid ${ruleUid}`);
  }
}

export async function improveTextWithAi(text: string) {
  await requireAuth();

  const url = process.env.N8N_AI_IMPROVE_URL;
  if (!url) {
    return { error: "AI service not configured" };
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ request_type: "improve", text }),
    });

    if (!response.ok) {
      return { error: "AI service error" };
    }

    const data = await response.json();
    return { result: data };
  } catch {
    return { error: "Failed to reach AI service" };
  }
}
