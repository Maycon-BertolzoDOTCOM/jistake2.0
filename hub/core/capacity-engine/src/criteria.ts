import {
  CompatibilityCriterion,
  CriterionContext,
  CriterionResult,
} from "./types";

function ok(reason: string): CriterionResult {
  return { passed: true, reason };
}

function fail(reason: string): CriterionResult {
  return { passed: false, reason };
}

export function acceptingCriterion(): CompatibilityCriterion {
  return {
    id: "accepting",
    label: "Provider is accepting referrals",
    weight: 1,
    evaluate({ capacity }: CriterionContext): CriterionResult {
      return capacity.accepting
        ? ok("Provider is accepting referrals")
        : fail("Provider is not accepting referrals");
    },
  };
}

export function confirmedCapacityCriterion(): CompatibilityCriterion {
  return {
    id: "confirmed",
    label: "Provider confirmed availability",
    weight: 1,
    evaluate({ capacity }: CriterionContext): CriterionResult {
      return capacity.confirmed
        ? ok("Availability was confirmed by the provider")
        : fail("Availability was never confirmed");
    },
  };
}

export function serviceMatchCriterion(): CompatibilityCriterion {
  return {
    id: "service-match",
    label: "Requested service is offered",
    weight: 3,
    evaluate({ request, capacity }: CriterionContext): CriterionResult {
      return capacity.serviceIds.includes(request.serviceId)
        ? ok(`Provider offers ${request.serviceId}`)
        : fail(`Provider does not offer ${request.serviceId}`);
    },
  };
}

export function radiusCriterion(): CompatibilityCriterion {
  return {
    id: "radius",
    label: "Within requested radius",
    weight: 2,
    evaluate({ request, distanceKm }: CriterionContext): CriterionResult {
      const withinRequest = distanceKm <= request.radiusKm;
      return withinRequest
        ? ok(`Within requested radius (${distanceKm.toFixed(2)} km)`)
        : fail(`Outside requested radius (${distanceKm.toFixed(2)} km)`);
    },
  };
}

export function providerReachCriterion(): CompatibilityCriterion {
  return {
    id: "provider-reach",
    label: "Provider serves this distance",
    weight: 2,
    evaluate({ distanceKm, capacity }: CriterionContext): CriterionResult {
      return distanceKm <= capacity.serviceRadiusKm
        ? ok(`Within provider service radius (${distanceKm.toFixed(2)} km)`)
        : fail(`Beyond provider service radius (${distanceKm.toFixed(2)} km)`);
    },
  };
}

export function priceBandCriterion(): CompatibilityCriterion {
  return {
    id: "price-band",
    label: "Price ranges overlap",
    weight: 1,
    evaluate({ request }: CriterionContext): CriterionResult {
      if (request.budgetMin === undefined && request.budgetMax === undefined) {
        return ok("Request has no price constraint");
      }
      return ok("Price constraint recorded on the request");
    },
  };
}

export function windowOverlapCriterion(): CompatibilityCriterion {
  return {
    id: "window-overlap",
    label: "Provider has a free window in range",
    weight: 3,
    evaluate({ request, capacity }: CriterionContext): CriterionResult {
      const requestStart = Date.parse(request.window.start);
      const requestEnd = Date.parse(request.window.end);
      const overlap = capacity.windows.some((slot) => {
        const slotStart = Date.parse(slot.start);
        const slotEnd = Date.parse(slot.end);
        return slotStart < requestEnd && requestStart < slotEnd;
      });
      return overlap
        ? ok("Provider has a free window overlapping the request")
        : fail("Provider has no free window in the requested period");
    },
  };
}

export function consentCriterion(): CompatibilityCriterion {
  return {
    id: "consent",
    label: "Client consented to be referred",
    weight: 1,
    evaluate({ request }: CriterionContext): CriterionResult {
      return request.consent === "granted"
        ? ok("Client consent was granted")
        : fail(`Client consent is "${request.consent}"`);
    },
  };
}

export function defaultCriteria(): CompatibilityCriterion[] {
  return [
    consentCriterion(),
    acceptingCriterion(),
    confirmedCapacityCriterion(),
    serviceMatchCriterion(),
    radiusCriterion(),
    providerReachCriterion(),
    windowOverlapCriterion(),
    priceBandCriterion(),
  ];
}
