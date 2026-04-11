import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

interface RuleFilters {
  groupId: number;
  sectionId?: number;
  ruleTypeId?: number;
  showArchived?: boolean;
  // RBAC
  isAdmin: boolean;
  userCategory?: number | null;
}

export async function getRules(filters: RuleFilters) {
  const {
    groupId,
    sectionId,
    ruleTypeId,
    showArchived = false,
    isAdmin,
    userCategory,
  } = filters;

  const where: Prisma.rulesWhereInput = {
    group_id: groupId,
    ...(sectionId && { section_id: sectionId }),
    ...(ruleTypeId && { rule_type_id: ruleTypeId }),
    ...(!showArchived && { status_id: 1 }),
    // RBAC: non-admin users only see rules matching their category
    ...(!isAdmin &&
      userCategory && {
        rule_applies_to: {
          some: { applies_to_id: userCategory },
        },
      }),
  };

  return prisma.rules.findMany({
    where,
    include: {
      decision_body: true,
      status: true,
      section: true,
      rule_type: true,
      rule_applies_to: {
        include: { applies_to: true },
      },
      rule_documents: {
        include: {
          document: {
            select: {
              id: true,
              title: true,
              file_name: true,
              mime_type: true,
              decision_date: true,
              decision_body: { select: { id: true, code: true, name: true } },
            },
          },
        },
      },
    },
    orderBy: [
      { section_id: "asc" },
      { rule_type_id: "asc" },
      { id: "asc" },
      { sub_id: "asc" },
    ],
  });
}

export async function getRuleByUid(ruleUid: number) {
  return prisma.rules.findUnique({
    where: { rule_uid: ruleUid },
    include: {
      decision_body: true,
      status: true,
      section: true,
      rule_type: true,
      rule_applies_to: {
        include: { applies_to: true },
      },
    },
  });
}

export async function getRuleCategories(ruleUid: number) {
  return prisma.rule_applies_to.findMany({
    where: { rule_uid: ruleUid },
    include: { applies_to: true },
  });
}

/** For PDF export: all active organizational rules */
export async function getAllRulesForPdf(
  isAdmin: boolean,
  userCategory?: number | null
) {
  return prisma.rules.findMany({
    where: {
      status_id: 1,
      group_id: 1,
      ...(!isAdmin &&
        userCategory && {
          rule_applies_to: {
            some: { applies_to_id: userCategory },
          },
        }),
    },
    include: {
      section: true,
      rule_type: true,
      decision_body: true,
    },
    orderBy: [
      { section_id: "asc" },
      { rule_type_id: "asc" },
      { id: "asc" },
      { sub_id: "asc" },
    ],
  });
}

/** For PDF export: all active personal decisions */
export async function getAllPersonalForPdf(
  isAdmin: boolean,
  userCategory?: number | null,
  persona?: string | null
) {
  return prisma.rules.findMany({
    where: {
      status_id: 1,
      group_id: 2,
      ...(!isAdmin &&
        userCategory && {
          rule_applies_to: {
            some: { applies_to_id: userCategory },
          },
        }),
      ...(persona && { persona }),
    },
    include: {
      decision_body: true,
    },
    orderBy: { id: "asc" },
  });
}
