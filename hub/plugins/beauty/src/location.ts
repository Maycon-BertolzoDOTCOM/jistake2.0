import {
  isValidGeoPoint,
  type GeoPoint,
  type LocationPrecision,
} from "@hub/capacity-engine";

/**
 * Onde a profissional atende. Nao e o alcance: o alcance e quanto ela aceita
 * percorrer e vive em `reachKm`, separado deste tipo.
 *
 * Reaproveita `LocationPrecision` do motor em vez de redefinir a union.
 */
export type LocationMode = LocationPrecision["mode"];

export type CoordinatesLocation = Extract<LocationPrecision, { mode: "coordinates" }>;
export type NeighborhoodLocation = Extract<LocationPrecision, { mode: "neighborhood" }>;
export type UnknownLocation = Extract<LocationPrecision, { mode: "unknown" }>;

export type ProviderLocation = LocationPrecision;

/** Dados brutos aceitos do documento. Todos opcionais, para nao invalidar documentos antigos. */
export interface RawLocation {
  lat?: unknown;
  lng?: unknown;
  neighborhood?: unknown;
  city?: unknown;
  state?: unknown;
  address?: unknown;
}

export interface LocationResolution {
  location: ProviderLocation;
  /** Endereco textual preservado. Nunca convertido em coordenada. */
  address?: string;
  /** Motivo pelo qual a localizacao nao pode sustentar correspondencia geografica. */
  reason?: string;
  /**
   * Verdadeiro quando a coordenada foi rejeitada por estar presente e invalida.
   * Sinaliza dado corrompido, que e diferente de dado ausente.
   */
  invalidCoordinates?: boolean;
}

function isPresentString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Normaliza bairro para comparacao: espacos colapsados, sem caixa alta,
 * sem acentos. Nao remove distinctions que mudam o significado do nome.
 */
export function normalizeNeighborhood(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Compara bairros. O mesmo nome em cidades diferentes NAO e o mesmo lugar,
 * entao cidade e estado sao obrigatorios para a comparacao.
 */
export function sameNeighborhood(
  left: NeighborhoodLocation,
  right: NeighborhoodLocation,
): boolean {
  if (normalizeNeighborhood(left.neighborhood) !== normalizeNeighborhood(right.neighborhood)) {
    return false;
  }
  const leftCity = isPresentString(left.city) ? normalizeNeighborhood(left.city) : undefined;
  const rightCity = isPresentString(right.city) ? normalizeNeighborhood(right.city) : undefined;
  if (leftCity !== rightCity) return false;

  const leftState = isPresentString(left.state) ? normalizeNeighborhood(left.state) : undefined;
  const rightState = isPresentString(right.state) ? normalizeNeighborhood(right.state) : undefined;
  return leftState === rightState;
}

/**
 * Decide o modo de localizacao a partir de dados brutos.
 *
 * Precedencia: coordenada valida > bairro declarado > desconhecido.
 * Uma coordenada presente e invalida NUNCA vira zero, e NUNCA vira bairro:
 * e dado corrompido e precisa aparecer como tal.
 */
export function resolveLocation(raw: RawLocation | undefined): LocationResolution {
  const address = raw && isPresentString(raw.address) ? raw.address.trim() : undefined;
  const hasLat = raw?.lat !== undefined && raw?.lat !== null;
  const hasLng = raw?.lng !== undefined && raw?.lng !== null;

  if (hasLat || hasLng) {
    const point = { lat: raw?.lat, lng: raw?.lng } as unknown as GeoPoint;
    if (isValidGeoPoint(point)) {
      return {
        location: { mode: "coordinates", point },
        address,
      };
    }
    return {
      location: { mode: "unknown" },
      address,
      invalidCoordinates: true,
      reason: "Coordenada presente e invalida. Nao foi convertida em zero nem em bairro.",
    };
  }

  if (isPresentString(raw?.neighborhood)) {
    const neighborhood = (raw.neighborhood as string).trim();
    const city = isPresentString(raw.city) ? (raw.city as string).trim() : undefined;
    const state = isPresentString(raw.state) ? (raw.state as string).trim() : undefined;
    return {
      location: { mode: "neighborhood", neighborhood, city, state },
      address,
      reason:
        "Somente regiao declarada. Permite comparacao regional, nao calcula distancia.",
    };
  }

  return {
    location: { mode: "unknown" },
    address,
    reason: "Sem coordenadas e sem regiao declarada.",
  };
}
