import type { ProviderCapacity, ServiceRequest } from "./types";

export interface CapacityCriteriaContribution {
  scope: string;
  label: string;
  describe(): string;
  criteria: CapacityCriterionDescriptor[];
}

export interface CapacityCriterionDescriptor {
  id: string;
  label: string;
  weight: number;
  evaluate(context: {
    request: unknown;
    capacity: unknown;
    distanceKm: number;
  }): { passed: boolean; reason: string };
}

export interface CriterionContext {
  request: ServiceRequest;
  capacity: ProviderCapacity;
  distanceKm: number;
}

export interface CriterionResult {
  passed: boolean;
  reason: string;
}

export interface CompatibilityCriterion {
  id: string;
  label: string;
  weight: number;
  evaluate(context: CriterionContext): CriterionResult;
}
