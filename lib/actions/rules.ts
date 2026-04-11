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
  documentIds?: number[];
}) {
  await requireAdmin();

  // Shift subsequent rules to make room for the new one
  const shiftedRuleUids = await shiftSubsequentRules(data);

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

  // Link documents
  if (data.documentIds && data.documentIds.length > 0) {
    await prisma.rule_documents.createMany({
      data: data.documentIds.map((docId) => ({
        rule_uid: rule.rule_uid,
        document_id: docId,
      })),
    });
  }

  // Trigger AI embedding for the new rule
  await triggerAiEmbed(rule.rule_uid);

  // Re-embed shifted rules (numbering changed in their content/metadata)
  for (const uid of shiftedRuleUids) {
    await prisma.$executeRaw`DELETE FROM rule_embeddings WHERE rule_uid = ${uid}`;
    await triggerAiEmbed(uid);
  }

  revalidatePath("/rules");
  revalidatePath("/personal");
  return rule;
}

async function shiftSubsequentRules(data: {
  id: number;
  subId: number;
  sectionId: number;
  ruleTypeId: number;
  groupId: number;
}): Promise<number[]> {
  if (data.subId > 0) {
    // Inserting a sub-item: shift sub_ids within the same section/type/id
    const toShift = await prisma.rules.findMany({
      where: {
        section_id: data.sectionId,
        rule_type_id: data.ruleTypeId,
        group_id: data.groupId,
        id: data.id,
        sub_id: { gte: data.subId },
        status_id: 1,
      },
      select: { rule_uid: true },
      orderBy: { sub_id: "desc" },
    });

    for (const r of toShift) {
      await prisma.rules.update({
        where: { rule_uid: r.rule_uid },
        data: { sub_id: { increment: 1 } },
      });
    }

    return toShift.map((r) => r.rule_uid);
  } else {
    // Inserting a top-level item: shift ids within the same section/type
    const toShift = await prisma.rules.findMany({
      where: {
        section_id: data.sectionId,
        rule_type_id: data.ruleTypeId,
        group_id: data.groupId,
        id: { gte: data.id },
        status_id: 1,
      },
      select: { rule_uid: true },
      orderBy: { id: "desc" },
    });

    for (const r of toShift) {
      await prisma.rules.update({
        where: { rule_uid: r.rule_uid },
        data: { id: { increment: 1 } },
      });
    }

    return toShift.map((r) => r.rule_uid);
  }
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
  // rule_embeddings uses vector type — use raw SQL
  await prisma.$executeRaw`DELETE FROM rule_embeddings WHERE rule_uid = ${ruleUid}`;
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

  // rule_embeddings uses vector type — use raw SQL
  await prisma.$executeRaw`DELETE FROM rule_embeddings WHERE rule_uid = ${ruleUid}`;
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

  // Delete embeddings first (no FK cascade, uses vector type)
  await prisma.$executeRaw`DELETE FROM rule_embeddings WHERE rule_uid = ${ruleUid}`;
  // rule_applies_to cascades via FK, but delete explicitly to be safe
  await prisma.rule_applies_to.deleteMany({ where: { rule_uid: ruleUid } });
  // Delete the rule
  await prisma.rules.delete({ where: { rule_uid: ruleUid } });

  revalidatePath("/rules");
  revalidatePath("/personal");
}

async function triggerAiEmbed(ruleUid: number) {
  const url = process.env.N8N_AI_EMBED_URL;
  if (!url) return;

  try {
    const requestUrl = `${url}?rule_uid=${ruleUid}`;
    console.log(`AI embed → GET ${requestUrl}`);
    const response = await fetch(requestUrl);
    console.log(`AI embed ← ${response.status} ${response.statusText}`);
  } catch (err) {
    console.error(`Failed to trigger AI embed for rule_uid ${ruleUid}:`, err);
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
      const body = await response.text();
      console.error(`AI improve error: ${response.status} ${response.statusText}`, body);
      return { error: `AI service error: ${response.status}` };
    }

    const data = await response.json();
    return { result: data };
  } catch (err) {
    console.error("AI improve fetch failed:", err);
    return { error: "Failed to reach AI service" };
  }
}
