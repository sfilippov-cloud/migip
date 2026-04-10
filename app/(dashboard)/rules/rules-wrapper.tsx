"use client";

import { useCallback } from "react";
import { useDashboard } from "@/components/dashboard-shell";
import { RulesClient } from "./rules-client";

type Props = React.ComponentProps<typeof RulesClient>;

export function RulesWrapper(props: Props) {
  const { setSelectedCategories } = useDashboard();

  const handleSelectRule = useCallback(
    (rule: Parameters<NonNullable<Props["onSelectRule"]>>[0]) => {
      if (rule) {
        setSelectedCategories(
          rule.rule_applies_to.map((r) => ({ name: r.applies_to.name }))
        );
      } else {
        setSelectedCategories([]);
      }
    },
    [setSelectedCategories]
  );

  return <RulesClient {...props} onSelectRule={handleSelectRule} />;
}
