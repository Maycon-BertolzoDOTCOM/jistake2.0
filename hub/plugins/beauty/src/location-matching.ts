import { haversineKm, isValidGeoPoint } from "@hub/capacity-engine";
import {
  sameNeighborhood,
  type NeighborhoodLocation,
  type ProviderLocation,
} from "./location";

/** Correspondencia com distancia calculada. Evidencia verificada. */
export interface GeographicMatch {
  kind: "geographic";
  providerId: string;
  distanceKm: number;
  withinRequestRadius: boolean;
  withinProviderReach: boolean;
  reason: string;
}

/** Correspondencia por regiao declarada. Nao tem distancia calculada. */
export interface RegionalMatch {
  kind: "regional";
  providerId: string;
  neighborhood: string;
  city?: string;
  state?: string;
  /** Sempre verdadeiro: deixa explicito que nao houve calculo de distancia. */
  approximate: true;
  reason: string;
}

export type LocationMatch = GeographicMatch | RegionalMatch;

/**
 * Verifica se a localizacao sustenta correspondencia.
 * `unknown` nunca sustenta, porque nao ha o que comparar.
 */
export function canMatchOnLocation(location: ProviderLocation): boolean {
  return location.mode === "coordinates" || location.mode === "neighborhood";
}

/**
 * Correspondencia geografica real, apenas com coordenadas validas.
 * Retorna `null` em vez de zero quando a distancia e desconhecida: zero e uma
 * distancia calculada, nao a ausencia de dado.
 */
export function matchGeographically(
  requestLocation: ProviderLocation,
  providerLocation: ProviderLocation,
  requestRadiusKm: number,
  providerReachKm: number,
): GeographicMatch | null {
  if (requestLocation.mode !== "coordinates" || providerLocation.mode !== "coordinates") {
    return null;
  }
  if (!isValidGeoPoint(requestLocation.point) || !isValidGeoPoint(providerLocation.point)) {
    return null;
  }

  const distanceKm = haversineKm(requestLocation.point, providerLocation.point);
  const withinRequestRadius = distanceKm <= requestRadiusKm;
  const withinProviderReach = distanceKm <= providerReachKm;

  return {
    kind: "geographic",
    providerId: "",
    distanceKm,
    withinRequestRadius,
    withinProviderReach,
    reason:
      withinRequestRadius && withinProviderReach
        ? `Distancia calculada: ${distanceKm.toFixed(2)} km, dentro do raio e do alcance`
        : `Distancia calculada: ${distanceKm.toFixed(2)} km, fora do raio ou do alcance`,
  };
}

/**
 * Correspondencia regional por bairro declarado.
 *
 * Nao calcula distancia e nao produz `GeographicMatch`. Exige cidade e estado
 * iguais: dois bairros homonimos em cidades diferentes sao lugares distintos.
 */
export function matchRegionally(
  requestLocation: ProviderLocation,
  providerLocation: ProviderLocation,
): RegionalMatch | null {
  if (requestLocation.mode !== "neighborhood" || providerLocation.mode !== "neighborhood") {
    return null;
  }
  if (!sameNeighborhood(requestLocation, providerLocation)) {
    return null;
  }

  return {
    kind: "regional",
    providerId: "",
    neighborhood: requestLocation.neighborhood,
    city: requestLocation.city,
    state: requestLocation.state,
    approximate: true,
    reason: `Mesma regiao declarada (${[requestLocation.neighborhood, requestLocation.city, requestLocation.state]
      .filter(Boolean)
      .join(", ")}). Distancia NAO calculada.`,
  };
}

/** Escolhe o metodo de correspondencia compativel com a precisao disponivel. */
export function matchByAvailablePrecision(
  requestLocation: ProviderLocation,
  providerLocation: ProviderLocation,
  requestRadiusKm: number,
  providerReachKm: number,
): LocationMatch | null {
  return (
    matchGeographically(requestLocation, providerLocation, requestRadiusKm, providerReachKm) ??
    matchRegionally(requestLocation, providerLocation)
  );
}

export function isVerifiedEvidence(match: LocationMatch): match is GeographicMatch {
  return match.kind === "geographic";
}

export function asNeighborhood(location: ProviderLocation): NeighborhoodLocation | null {
  return location.mode === "neighborhood" ? location : null;
}
