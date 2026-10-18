import type { CompatibilityCriterion } from "./types";

/**
 * Contrato de extensao de capacidade, espelhando a forma declarada por
 * `@hub/reactor-config` sem duplicar os tipos de dominio.
 *
 * `CompatibilityCriterion` NAO e redeclarado aqui: e reexportado de `./types`.
 * Declarar duas vezes fez os tipos divergirem silenciosamente quando
 * `CriterionResult.inconclusive` virou obrigatorio.
 */
export interface CapacityCriteriaContribution {
  scope: string;
  label: string;
  describe(): string;
  criteria: CapacityCriterionDescriptor[];
}

/**
 * Forma estrutural minima, compativel com `CompatibilityCriterion` do motor.
 * `request` e `capacity` sao `unknown` porque o reactor-config e leaf e nao
 * conhece os tipos de dominio.
 */
export interface CapacityCriterionDescriptor {
  id: string;
  label: string;
  weight: number;
  evaluate(context: {
    request: unknown;
    capacity: unknown;
    distanceKm: number | null;
  }): { passed: boolean; reason: string; inconclusive?: boolean };
}

export type { CompatibilityCriterion };
