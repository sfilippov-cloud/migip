import { formatDate } from "@/lib/utils";

type RuleForPdf = {
  id: number | null;
  sub_id: number | null;
  section_id: number | null;
  rule_type_id: number | null;
  decision_date: Date | null;
  text: string | null;
  persona?: string | null;
  section?: { id: number; name: string | null } | null;
  rule_type?: { id: number; name: string | null } | null;
  decision_body?: { id: number; code: string | null; name: string | null } | null;
};

/**
 * Generate HTML for organizational rules PDF export.
 * Ported from Retool's formatPdfContent / downloadPdfDocument.
 */
export function generateRulesPdfHtml(rules: RuleForPdf[]): string {
  let currentSection = "";
  let currentType = "";

  let body = "";

  for (const rule of rules) {
    const sectionName = rule.section?.name ?? "";
    const typeName = rule.rule_type?.name ?? "";

    if (sectionName !== currentSection) {
      currentSection = sectionName;
      currentType = "";
      body += `<h2 style="margin-top:24px;color:#1a1a1a;">${rule.section_id}. ${sectionName}</h2>`;
    }

    if (typeName !== currentType) {
      currentType = typeName;
      body += `<h3 style="margin-top:16px;color:#333;">${rule.rule_type_id}. ${typeName}</h3>`;
    }

    const itemNum = rule.sub_id
      ? `${rule.id}.${rule.sub_id}`
      : `${rule.id}`;

    const code = rule.decision_body?.code ?? "";
    const date = formatDate(rule.decision_date);
    const meta = [code, date].filter(Boolean).join(" от ");

    body += `
      <div style="margin:8px 0;padding:8px 12px;border-left:3px solid #ddd;">
        <strong>${itemNum}.</strong> ${escapeHtml(rule.text ?? "")}
        ${meta ? `<br/><small style="color:#666;">(${meta})</small>` : ""}
      </div>
    `;
  }

  return wrapHtml("ПРАВИЛА МИГИПА", body);
}

/**
 * Generate HTML for personal decisions PDF export.
 * Ported from Retool's formatPDF_personal / downloadPdf_personal.
 */
export function generatePersonalPdfHtml(rules: RuleForPdf[]): string {
  let currentPersona = "";
  let body = "";

  for (const rule of rules) {
    const persona = rule.persona ?? "";

    if (persona !== currentPersona) {
      currentPersona = persona;
      body += `<h2 style="margin-top:24px;color:#1a1a1a;">${persona}</h2>`;
    }

    const code = rule.decision_body?.code ?? "";
    const date = formatDate(rule.decision_date);
    const meta = [code, date].filter(Boolean).join(" от ");

    body += `
      <div style="margin:8px 0;padding:8px 12px;border-left:3px solid #ddd;">
        <strong>${rule.id}.</strong> ${escapeHtml(rule.text ?? "")}
        ${meta ? `<br/><small style="color:#666;">(${meta})</small>` : ""}
      </div>
    `;
  }

  return wrapHtml("ПЕРСОНАЛЬНЫЕ РЕШЕНИЯ", body);
}

function wrapHtml(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5; max-width: 800px; margin: 0 auto; padding: 40px 20px; }
    h1 { text-align: center; margin-bottom: 32px; }
    h2 { border-bottom: 1px solid #ccc; padding-bottom: 4px; }
    h3 { color: #555; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>${title}</h1>
  ${body}
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
