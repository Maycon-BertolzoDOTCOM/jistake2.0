import { EntityParserContribution, ParsedEntity, SanitizedResult, Entity } from "@hub/reactor-config";

interface HL7Message {
  msh: MSHSegment;
  segments: Record<string, unknown>[];
}

interface MSHSegment {
  fieldSeparator: string;
  encodingCharacters: string;
  sendingApplication: string;
  sendingFacility: string;
  receivingApplication: string;
  receivingFacility: string;
  timestamp: string;
  messageType: string;
  messageControlId: string;
  processingId: string;
  versionId: string;
}

interface FHIRBundle {
  resourceType: "Bundle";
  type: string;
  entry: FHIREntry[];
}

interface FHIREntry {
  resource: {
    resourceType: string;
    id: string;
    [key: string]: unknown;
  };
}

export class SaudeParser implements EntityParserContribution {
  canParse(file: Buffer, mime: string): boolean {
    const content = file.toString("utf-8");
    if (mime === "application/hl7-v2" || mime === "text/x-hl7") {
      return content.startsWith("MSH|");
    }
    if (mime === "application/fhir+json" || mime === "application/json") {
      try {
        const parsed = JSON.parse(content);
        return parsed.resourceType === "Bundle" || parsed.resourceType === "Patient";
      } catch {
        return false;
      }
    }
    return false;
  }

  async parse(file: Buffer): Promise<ParsedEntity> {
    const content = file.toString("utf-8");
    const entities: Entity[] = [];

    if (content.startsWith("MSH|")) {
      const hl7 = this.parseHL7(content);
      entities.push({
        id: hl7.msh.messageControlId,
        label: `HL7 ${hl7.msh.messageType} - ${hl7.msh.sendingFacility}`,
        metadata: {
          type: "hl7-message",
          messageType: hl7.msh.messageType,
          sendingFacility: hl7.msh.sendingFacility,
          timestamp: hl7.msh.timestamp,
          segments: Object.keys(hl7.segments),
        },
        type: "hl7",
      });
    } else {
      try {
        const fhir = JSON.parse(content) as FHIRBundle | { resourceType: string; id?: string };
        if (fhir.resourceType === "Bundle" && "entry" in fhir) {
          for (const entry of (fhir as FHIRBundle).entry) {
            const resource = entry.resource;
            entities.push({
              id: resource.id,
              label: `${resource.resourceType}: ${resource.id}`,
              metadata: {
                type: "fhir-resource",
                ...resource,
                resourceType: resource.resourceType,
              },
              type: resource.resourceType.toLowerCase(),
            });
          }
        } else {
          entities.push({
            id: ("id" in fhir && fhir.id ? fhir.id : "unknown"),
            label: `${fhir.resourceType}: ${"id" in fhir ? fhir.id : "unknown"}`,
            metadata: {
              type: "fhir-resource",
              ...fhir,
            },
            type: fhir.resourceType.toLowerCase(),
          });
        }
      } catch {
        // não é JSON válido
      }
    }

    return {
      entities,
      metadata: {
        total: entities.length,
        source: "saude-hl7-fhir",
        parsedAt: new Date().toISOString(),
      },
    };
  }

  private parseHL7(content: string): HL7Message {
    const lines = content.split(/\r?\n/);
    const mshLine = lines[0];
    const fields = mshLine.split("|");

    const msh: MSHSegment = {
      fieldSeparator: fields[0] || "|",
      encodingCharacters: fields[1] || "^~\\&",
      sendingApplication: fields[2] || "",
      sendingFacility: fields[3] || "",
      receivingApplication: fields[4] || "",
      receivingFacility: fields[5] || "",
      timestamp: fields[6] || "",
      messageType: fields[8] || "",
      messageControlId: fields[9] || "",
      processingId: fields[10] || "P",
      versionId: fields[11] || "2.5.1",
    };

    const segments: Record<string, unknown>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      const segFields = line.split("|");
      const segName = segFields[0];
      segments.push({ [segName]: segFields.slice(1) });
    }

    return { msh, segments };
  }

  sanitize(file: Buffer): SanitizedResult {
    const content = file.toString("utf-8");
    const removed: string[] = [];

    const sanitized = content
      .replace(/PID\|\d+\|[^|]*\|[^|]*\|[^|]*\|([^|]*)/g, (match, name) => {
        if (name) {
          removed.push("Nome do paciente removido do PID");
          return match.replace(name, "[REDACTED]");
        }
        return match;
      })
      .replace(/PID\|\d+\|[^|]*\|[^|]*\|[^|]*\|[^|]*\|([^|]*)/g, (match, dob) => {
        if (dob) {
          removed.push("Data de nascimento removida do PID");
          return match.replace(dob, "[REDACTED]");
        }
        return match;
      })
      .replace(/PV1\|\d+\|[^|]*\|([^|]*)/g, (match, location) => {
        if (location) {
          removed.push("Localização removida do PV1");
          return match.replace(location, "[REDACTED]");
        }
        return match;
      });

    return {
      safe: true,
      sanitized: Buffer.from(sanitized, "utf-8"),
      removed,
    };
  }
}

export const saudeParser = new SaudeParser();