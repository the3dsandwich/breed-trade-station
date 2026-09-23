import type { PuffTraits, Request } from "@bts/shared";
import { traitValueLabel } from "./traitLabels";

// Compare visible traits only; these matches do not predict offspring.
export const compareRequest = (traits: PuffTraits, request: Request) =>
  request.requirements.map((requirement) => {
    const actualValue = traits[requirement.trait];
    return {
      trait: requirement.trait,
      actualValue,
      actualLabel: traitValueLabel(requirement.trait, actualValue),
      matches: actualValue === requirement.value,
    };
  });
