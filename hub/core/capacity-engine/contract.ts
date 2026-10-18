/**
 * Assertiva de contrato em tempo de compilacao.
 *
 * `*.test.ts` esta no `exclude` do tsconfig e o vitest remove tipos, portanto
 * checagem de compatibilidade feita apenas em teste nunca e compilada. Este
 * arquivo vive em `src/` para que `tsc -b` force a verificacao.
 *
 * Se `reactor-config` e `capacity-engine` divergirem, o build falha aqui.
 */
import type {
  CapacityCriteriaContribution as DeclaredContribution,
  CapacityCriterionDescriptor as DeclaredDescriptor,
} from "@hub/reactor-config";
import type {
  CapacityCriteriaContribution,
  CompatibilityCriterion,
} from "./src/contribution";

/** A implementacao real e o proprio `CompatibilityCriterion` do motor. */
type RealDescriptor = CompatibilityCriterion;

/** O contrato declarado aceita a implementacao real. */
export const declaresRealImplementation: DeclaredContribution =
  null as unknown as CapacityCriteriaContribution;

/** O contrato declarado aceita um criterio real isolado. */
export const declaresRealCriterion: DeclaredDescriptor =
  null as unknown as CompatibilityCriterion;

/**
 * Sentinela em tempo de compilacao: se as chaves divergirem, a atribuicao abaixo
 * deixa de compilar. O valor em tempo de execucao nunca e material.
 */
type DeclaredKeys = keyof DeclaredContribution;
type RealKeys = keyof CapacityCriteriaContribution;

export const EXACT_KEY_PARITY: DeclaredKeys extends RealKeys
  ? RealKeys extends DeclaredKeys
    ? true
    : never
  : never = true;

type DeclaredDescriptorKeys = keyof DeclaredDescriptor;
type RealDescriptorKeys = keyof CompatibilityCriterion;

export const EXACT_DESCRIPTOR_PARITY: DeclaredDescriptorKeys extends RealDescriptorKeys
  ? RealDescriptorKeys extends DeclaredDescriptorKeys
    ? true
    : never
  : never = true;

/**
 * Paridade de ASSINATURA do metodo `evaluate`.
 *
 * A paridade de chaves de topo nao pega mudanca em `distanceKm: number` para
 * `number | null`, porque o nome da propriedade continua igual. Esta sentinela
 * compara os tipos e falha o build quando o shape declarado e a implementacao
 * divergem dentro do metodo.
 */
type DeclaredEvaluateDistance = Parameters<DeclaredDescriptor["evaluate"]>[0]["distanceKm"];
type RealEvaluateDistance = Parameters<RealDescriptor["evaluate"]>[0]["distanceKm"];

export const EVALUATE_DISTANCE_PARITY: [DeclaredEvaluateDistance] extends [RealEvaluateDistance]
  ? [RealEvaluateDistance] extends [DeclaredEvaluateDistance]
    ? true
    : never
  : never = true;

type DeclaredEvaluateResult = ReturnType<DeclaredDescriptor["evaluate"]>;
type RealEvaluateResult = ReturnType<RealDescriptor["evaluate"]>;

/**
 * O shape declarado precisa aceitar `inconclusive`, senao um plugin que
 * sinalize bloqueio por falta de dado nao consegue expressar isso pelo contrato.
 */
export const EVALUATE_RESULT_PARITY: keyof RealEvaluateResult extends keyof DeclaredEvaluateResult
  ? true
  : never = true;
