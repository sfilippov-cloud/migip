import { prisma } from "@/lib/db";

export async function getSections() {
  return prisma.sections.findMany({
    where: { id: { not: 0 } },
    orderBy: { id: "asc" },
  });
}

export async function getRuleTypes() {
  return prisma.rule_types.findMany({
    where: { id: { not: 0 } },
    orderBy: { id: "asc" },
  });
}

export async function getDecisionBodies() {
  return prisma.decision_bodies.findMany();
}

export async function getAppliesTo() {
  return prisma.applies_to.findMany();
}

export async function getRuleStatuses() {
  return prisma.rule_statuses.findMany();
}

export async function getDocGroups() {
  return prisma.doc_group.findMany();
}

export async function getPersonas() {
  const results = await prisma.rules.findMany({
    where: { persona: { not: null } },
    select: { persona: true },
    distinct: ["persona"],
    orderBy: { persona: "asc" },
  });
  return results.map((r) => r.persona!);
}
