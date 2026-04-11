import React from "react";
import { Document, Page, Text, View, StyleSheet, Font, renderToBuffer } from "@react-pdf/renderer";
import { formatDate } from "@/lib/utils";

// Register a Cyrillic-supporting font
Font.register({
  family: "Roboto",
  fonts: [
    { src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf", fontWeight: 400 },
    { src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf", fontWeight: 700 },
  ],
});

const s = StyleSheet.create({
  page: { fontFamily: "Roboto", fontSize: 10, padding: 40, lineHeight: 1.5 },
  title: { fontSize: 16, fontWeight: 700, textAlign: "center", marginBottom: 24 },
  sectionHeader: { fontSize: 13, fontWeight: 700, marginTop: 18, marginBottom: 6, borderBottom: "1pt solid #ccc", paddingBottom: 3 },
  typeHeader: { fontSize: 11, fontWeight: 700, color: "#555", marginTop: 10, marginBottom: 4 },
  ruleRow: { marginBottom: 6, paddingLeft: 10, borderLeft: "2pt solid #ddd", paddingVertical: 3 },
  ruleNum: { fontWeight: 700 },
  ruleMeta: { fontSize: 8, color: "#666", marginTop: 2 },
  personaHeader: { fontSize: 13, fontWeight: 700, marginTop: 18, marginBottom: 6, borderBottom: "1pt solid #ccc", paddingBottom: 3 },
});

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

function RulesDocument({ rules, title }: { rules: RuleForPdf[]; title: string }) {
  let currentSection = "";
  let currentType = "";

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.title}>{title}</Text>
        {rules.map((rule, i) => {
          const sectionName = rule.section?.name ?? "";
          const typeName = rule.rule_type?.name ?? "";
          const elements: React.ReactNode[] = [];

          if (sectionName !== currentSection) {
            currentSection = sectionName;
            currentType = "";
            elements.push(
              <Text key={`s-${i}`} style={s.sectionHeader}>
                {rule.section_id}. {sectionName}
              </Text>
            );
          }

          if (typeName !== currentType) {
            currentType = typeName;
            elements.push(
              <Text key={`t-${i}`} style={s.typeHeader}>
                {rule.rule_type_id}. {typeName}
              </Text>
            );
          }

          const itemNum = rule.sub_id ? `${rule.id}.${rule.sub_id}` : `${rule.id}`;
          const code = rule.decision_body?.code ?? "";
          const date = formatDate(rule.decision_date);
          const meta = [code, date].filter(Boolean).join(" от ");

          elements.push(
            <View key={`r-${i}`} style={s.ruleRow}>
              <Text>
                <Text style={s.ruleNum}>{itemNum}. </Text>
                {rule.text ?? ""}
              </Text>
              {meta ? <Text style={s.ruleMeta}>({meta})</Text> : null}
            </View>
          );

          return elements;
        })}
      </Page>
    </Document>
  );
}

function PersonalDocument({ rules, title }: { rules: RuleForPdf[]; title: string }) {
  let currentPersona = "";

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.title}>{title}</Text>
        {rules.map((rule, i) => {
          const persona = rule.persona ?? "";
          const elements: React.ReactNode[] = [];

          if (persona !== currentPersona) {
            currentPersona = persona;
            elements.push(
              <Text key={`p-${i}`} style={s.personaHeader}>{persona}</Text>
            );
          }

          const code = rule.decision_body?.code ?? "";
          const date = formatDate(rule.decision_date);
          const meta = [code, date].filter(Boolean).join(" от ");

          elements.push(
            <View key={`r-${i}`} style={s.ruleRow}>
              <Text>
                <Text style={s.ruleNum}>{rule.id}. </Text>
                {rule.text ?? ""}
              </Text>
              {meta ? <Text style={s.ruleMeta}>({meta})</Text> : null}
            </View>
          );

          return elements;
        })}
      </Page>
    </Document>
  );
}

export async function generateRulesPdf(rules: RuleForPdf[]): Promise<Buffer> {
  return renderToBuffer(<RulesDocument rules={rules} title="ПРАВИЛА МИГИПА" />);
}

export async function generatePersonalPdf(rules: RuleForPdf[]): Promise<Buffer> {
  return renderToBuffer(<PersonalDocument rules={rules} title="ПЕРСОНАЛЬНЫЕ РЕШЕНИЯ" />);
}
