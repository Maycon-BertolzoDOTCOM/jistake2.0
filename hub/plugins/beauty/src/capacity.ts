import {
  resolveLocation,
  type ProviderLocation,
  type RawLocation,
} from "./location";
import type {
  CapacityCriteriaContribution as DeclaredContribution,
  CapacityCriterionDescriptor as DeclaredDescriptor,
} from "@hub/reactor-config";
import {
  defaultCriteria,
  type CompatibilityCriterion,
  type CriterionContext,
  type CriterionResult,
  type ProviderCapacity,
  type ServiceRequest,
  type ServiceWindow,
} from "@hub/capacity-engine";

export const BEAUTY_SCOPE = "beauty";
export const BEAUTY_DEFAULT_RADIUS_KM = 5;
export const BEAUTY_MAX_RADIUS_KM = 8;

export interface GeoInput {
  lat: number;
  lng: number;
}

/**
 * Lacuna operacional: dado que a operacao real fornece mas que ainda nao existe,
 * ou que nao pode ser derivado sem fonte externa.
 *
 * `blocking: true` significa que a capacidade nao pode ser afirmada enquanto a
 * lacuna existir. Nunca e preenchido com valor inventado.
 */
export interface CapacityGap {
  field: string;
  reason: string;
  blocking: boolean;
}

export interface AdaptationReport<T> {
  data: T;
  gaps: CapacityGap[];
  ready: boolean;
}

/**
 * Forma minima do documento de beleza que o adaptador consegue ler.
 * Deliberadamente declarada aqui em vez de importada de `parser.ts`, para que
 * o adaptador dependa do formato, nao do parser.
 */
export interface BeautyOperationalDocument {
  salon?: {
    id: string;
    capacity?: number;
    radiusKm?: number;
    /** Campo legado em texto. Nunca convertido em coordenada. */
    address?: string;
    location?: GeoInput & RawLocation;
    neighborhood?: string;
    city?: string;
    state?: string;
  };
  services?: Array<{ id: string; price: number; durationMinutes?: number }>;
  professionals?: Array<{
    id: string;
    specialties?: string[];
    availability?: string[];
    address?: string;
    location?: GeoInput & RawLocation;
    neighborhood?: string;
    city?: string;
    state?: string;
    /** Alcance: ate onde aceita atender. Distinto de onde esta. */
    reachKm?: number;
    weeklyCapacity?: number;
    accepting?: boolean;
    confirmed?: boolean;
  }>;
  appointments?: Array<{
    id: string;
    clientId: string;
    serviceId: string;
    professionalId?: string;
    start: string;
    status: string;
    overflowFrom?: string;
  }>;
  clients?: Array<{ id: string; consent?: boolean }>;
}

function gap(field: string, reason: string, blocking = true): CapacityGap {
  return { field, reason, blocking };
}

/**
 * Converte disponibilidade declarada em janelas com duracao.
 *
 * O documento pode trazer um instante (`09:00`) ou um intervalo explicito
 * (`09:00/10:30`). Um instante isolado NAO define agenda livre, porque nada
 * informa quanto tempo a profissional pretende dedicar. Nesse caso devolvemos
 * zero janelas e deixamos a lacuna aparecer, em vez de assumir uma duracao.
 */
export function toServiceWindows(availability: string[]): ServiceWindow[] {
  const windows: ServiceWindow[] = [];

  for (const entry of availability) {
    if (entry.includes("/")) {
      const [start, end] = entry.split("/");
      if (start && end && isIsoInstant(start) && isIsoInstant(end)) {
        windows.push({ start, end });
      }
      continue;
    }

    const [start, end] = entry.split("..");
    if (start && end && isIsoInstant(start) && isIsoInstant(end)) {
      windows.push({ start, end });
    }
  }

  return windows;
}

function isIsoInstant(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value);
}

/**
 * Converte profissionais em capacidade disponivel.
 *
 * Mapeia apenas o que existe no documento. Ausencia de coordenada, disponibilidade
 * ou capacidade vira lacuna, nunca valor presumido.
 */
export function adaptCapacities(
  document: BeautyOperationalDocument,
): AdaptationReport<ProviderCapacity[]> {
  const gaps: CapacityGap[] = [];
  const professionals = document.professionals ?? [];

  if (professionals.length === 0) {
    gaps.push(
      gap(
        "professionals",
        "Nenhuma profissional cadastrada. A capacidade da rede ainda nao foi observada.",
      ),
    );
  }

  const now = new Date().toISOString();
  const capacities: ProviderCapacity[] = [];

  for (const professional of professionals) {
    const resolution = resolveLocation({
      ...(professional.location ?? {}),
      neighborhood: professional.neighborhood,
      city: professional.city,
      state: professional.state,
      address: professional.address ?? professional.location?.address,
    });

    if (resolution.location.mode === "unknown") {
      gaps.push(
        gap(
          `professionals.${professional.id}.location`,
          resolution.invalidCoordinates === true
            ? "Coordenada presente e invalida. Nao convertida em zero nem em bairro."
            : "Localizacao insuficiente. Sem coordenadas nem regiao declarada nao ha o que comparar.",
        ),
      );
      continue;
    }

    if (resolution.invalidCoordinates) {
      gaps.push(
        gap(
          `professionals.${professional.id}.location`,
          "Coordenada invalida foi rejeitada; regiao declarada foi usada.",
          false,
        ),
      );
    }

    if (!professional.availability || professional.availability.length === 0) {
      gaps.push(
        gap(
          `professionals.${professional.id}.availability`,
          "Sem disponibilidade declarada. Nada pode ser afirmado sobre agenda livre.",
        ),
      );
      continue;
    }

    const windows = toServiceWindows(professional.availability);
    if (windows.length === 0) {
      gaps.push(
        gap(
          `professionals.${professional.id}.availability`,
          "Disponibilidade em formato de instante, sem duração. Sem duração declarada não é possível afirmar agenda livre.",
        ),
      );
      continue;
    }

    if (professional.weeklyCapacity === undefined) {
      gaps.push(
        gap(
          `professionals.${professional.id}.weeklyCapacity`,
          "Capacidade semanal nao informada. O documento expoe apenas o total do salao.",
          false,
        ),
      );
    }

    capacities.push({
      providerId: professional.id,
      serviceIds: professional.specialties ?? [],
      location: resolution.location,
      serviceRadiusKm:
        professional.reachKm ?? document.salon?.radiusKm ?? BEAUTY_DEFAULT_RADIUS_KM,
      windows,
      weeklyCapacity: professional.weeklyCapacity ?? document.salon?.capacity ?? 0,
      accepting: professional.accepting ?? false,
      confirmed: professional.confirmed === true,
      updatedAt: now,
    });
  }

  const blocking = gaps.some((entry) => entry.blocking);
  return { data: capacities, gaps, ready: !blocking && capacities.length > 0 };
}

/**
 * Converte agendamentos nao atendidos em solicitacoes de recuperacao.
 *
 * Somente agendamento marcado como overflow entra. Agendamento comum nao e
 * demanda excedente.
 */
/**
 * Converte agendamentos nao atendidos em solicitacoes de recuperacao.
 *
 * Somente agendamento marcado como overflow entra. Agendamento comum nao e
 * demanda excedente.
 *
 * A janela deriva da duracao real do servico. Um agendamento so carrega
 * `start`; sem `durationMinutes` nao existe fim, e uma janela de duracao zero
 * jamais casa com qualquer agenda. Nesse caso a lacuna e declarada.
 */
export function adaptRequests(
  document: BeautyOperationalDocument,
): AdaptationReport<ServiceRequest[]> {
  const gaps: CapacityGap[] = [];
  const now = new Date().toISOString();
  const clientsById = new Map((document.clients ?? []).map((client) => [client.id, client]));

  const salonResolution = resolveLocation({
    ...(document.salon?.location ?? {}),
    neighborhood: document.salon?.neighborhood,
    city: document.salon?.city,
    state: document.salon?.state,
    address: document.salon?.address,
  });

  if (salonResolution.location.mode === "unknown") {
    gaps.push(
      gap(
        "salon.location",
        salonResolution.invalidCoordinates === true
          ? "Coordenada do salao presente e invalida. Nenhuma solicitacao pode ser geodesicamente qualificada."
          : "Sem coordenadas nem regiao declarada para o salao. Nenhuma solicitacao pode ser qualificada.",
      ),
    );
  } else if (salonResolution.location.mode === "neighborhood") {
    gaps.push(
      gap(
        "salon.location",
        "Somente regiao declarada. Correspondencia regional e possivel, distancia nao.",
        false,
      ),
    );
  }

  const overflow = (document.appointments ?? []).filter(
    (appointment) => appointment.overflowFrom !== undefined,
  );

  if (overflow.length === 0) {
    gaps.push(
      gap(
        "appointments[].overflowFrom",
        "Nenhuma solicitacao recusada registrada. O piloto ainda nao produziu demanda excedente observavel.",
        false,
      ),
    );
  }

  if (overflow.length > 0 && (document.clients ?? []).length === 0) {
    gaps.push(
      gap(
        "clients",
        "Ha overflow registrado mas nenhum cliente identificado. Consentimento e impossible de verificar.",
      ),
    );
  }

  const requests: ServiceRequest[] = [];
  const radiusKm = document.salon?.radiusKm ?? BEAUTY_DEFAULT_RADIUS_KM;
  const durationsByService = new Map(
    (document.services ?? [])
      .filter((service) => typeof service.durationMinutes === "number")
      .map((service) => [service.id, service.durationMinutes as number]),
  );

  for (const appointment of overflow) {
    if (salonResolution.location.mode === "unknown") continue;

    const client = clientsById.get(appointment.clientId);
    const consent = client?.consent === true;

    if (!consent) {
      gaps.push(
        gap(
          `appointments.${appointment.id}.consent`,
          "Consentimento da cliente ausente ou negado. Encaminhamento bloqueado.",
        ),
      );
      continue;
    }

    const durationMinutes = durationsByService.get(appointment.serviceId);
    if (durationMinutes === undefined) {
      gaps.push(
        gap(
          `appointments.${appointment.id}.window`,
          "Servico sem duracao declarada. Sem duracao nao existe janela de atendimento.",
        ),
      );
      continue;
    }

    const startMs = Date.parse(appointment.start);
    if (Number.isNaN(startMs)) {
      gaps.push(
        gap(
          `appointments.${appointment.id}.start`,
          "Data de inicio invalida. Nao e possivel montar a janela de atendimento.",
        ),
      );
      continue;
    }

    requests.push({
      id: appointment.id,
      origin: "referral",
      requesterId: appointment.overflowFrom ?? document.salon!.id,
      serviceId: appointment.serviceId,
      location: salonResolution.location,
      radiusKm,
      window: {
        start: appointment.start,
        end: new Date(startMs + durationMinutes * 60_000).toISOString(),
      },
      urgency: "normal",
      consent: "granted",
      createdAt: now,
      expiresAt: now,
    });
  }

  const blocking = gaps.some((entry) => entry.blocking);
  return { data: requests, gaps, ready: !blocking && requests.length > 0 };
}

function result(passed: boolean, reason: string): CriterionResult {
  return { passed, reason };
}

/**
 * Criterios de compatibilidade especificos de beleza.
 *
 * Este e o unico lugar do sistema onde o dominio de beleza aparece no caminho de
 * decisao. O motor recebe `CompatibilityCriterion` e nao sabe o que e manicure.
 */
export function beautyCriteria(): CompatibilityCriterion[] {
  const generic = defaultCriteria();

  const specialty: CompatibilityCriterion = {
    id: "beauty-specialty",
    label: "Especialidade compativel",
    weight: 3,
    evaluate({ request, capacity }: CriterionContext): CriterionResult {
      const offered = capacity.serviceIds;
      if (offered.length === 0) {
        return result(false, "Nenhuma especialidade declarada");
      }
      return offered.includes(request.serviceId)
        ? result(true, "Especialidade compativel")
        : result(false, "Especialidade nao compativel");
    },
  };

  const radius: CompatibilityCriterion = {
    id: "beauty-radius",
    label: "Dentro do raio do bairro",
    weight: 2,
    evaluate({ request, distanceKm }: CriterionContext): CriterionResult {
      if (distanceKm === null) {
        return {
          passed: false,
          reason: "Sem coordenadas: raio nao pode ser verificado",
          inconclusive: true,
        };
      }
      const limit = Math.min(request.radiusKm, BEAUTY_MAX_RADIUS_KM);
      return distanceKm <= limit
        ? result(true, `Dentro do raio de ${limit} km`)
        : result(false, `Fora do raio de ${limit} km`);
    },
  };

  const budget: CompatibilityCriterion = {
    id: "beauty-budget",
    label: "Faixa de preco viavel",
    weight: 1,
    evaluate({ request }: CriterionContext): CriterionResult {
      if (request.budgetMin === undefined && request.budgetMax === undefined) {
        return result(true, "Sem restricao de preco declarada");
      }
      return result(true, "Faixa de preco registrada na solicitacao");
    },
  };

  return [...generic, specialty, radius, budget];
}

export const beautyCapacityCriteria: DeclaredContribution = {
  scope: BEAUTY_SCOPE,
  label: "Beleza",
  describe: (): string =>
    [
      "Servicos compativeis por especialidade declarada.",
      "Distancia ate o limite do bairro, com teto de raio configuravel.",
      "Disponibilidade confirmada manualmente pela parceira antes do encaminhamento.",
      "Consentimento explicito da cliente e obrigatorio para qualquer encaminhamento.",
    ].join(" "),
  criteria: beautyCriteria() as DeclaredDescriptor[],
};
