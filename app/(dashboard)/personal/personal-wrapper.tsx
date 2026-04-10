"use client";

import { useCallback } from "react";
import { useDashboard } from "@/components/dashboard-shell";
import { PersonalClient } from "./personal-client";

type Props = React.ComponentProps<typeof PersonalClient>;

export function PersonalWrapper(props: Props) {
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

  return <PersonalClient {...props} onSelectRule={handleSelectRule} />;
}
