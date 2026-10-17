import { GeoPoint } from "./types";

const EARTH_RADIUS_KM = 6371;

export class InvalidCoordinateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidCoordinateError";
  }
}

export function isValidGeoPoint(point: unknown): point is GeoPoint {
  if (typeof point !== "object" || point === null) return false;
  const candidate = point as Record<string, unknown>;
  const { lat, lng } = candidate;
  if (typeof lat !== "number" || typeof lng !== "number") return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;
  return true;
}

export function assertValidGeoPoint(point: GeoPoint): void {
  if (!isValidGeoPoint(point)) {
    throw new InvalidCoordinateError(
      `Coordenada invalida: lat=${String((point as Record<string, unknown>).lat)} lng=${String((point as Record<string, unknown>).lng)}`,
    );
  }
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function haversineKm(from: GeoPoint, to: GeoPoint): number {
  assertValidGeoPoint(from);
  assertValidGeoPoint(to);

  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}
