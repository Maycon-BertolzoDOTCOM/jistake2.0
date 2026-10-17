import {
  TimelineProviderContribution,
  Entity,
  TimelineBlock,
  ValidationResult,
  ValidationError,
} from "@hub/reactor-config";

const REEL_ORDER = ["trailer", "advertisement", "feature", "credits", "intermission"];

export class CinemaTimeline implements TimelineProviderContribution {
  async getBlocks(entities: Entity[]): Promise<TimelineBlock[]> {
    const blocks: TimelineBlock[] = [];

    const cpls = entities.filter((e) => e.type === "cpl");
    const reels = entities.filter((e) => e.type === "reel");

    for (const cpl of cpls) {
      const cplReels = reels.filter((r) => r.metadata.cplId === cpl.id);

      for (let i = 0; i < cplReels.length; i++) {
        const reel = cplReels[i];
        const order = this.getReelOrder(reel);

        blocks.push({
          id: `block-${reel.id}`,
          entityId: reel.id,
          order: i,
          x: i * 220,
          y: 50,
          width: 200,
          height: 120,
          metadata: {
            entityType: "reel",
            reelType: this.getReelType(reel),
            duration: reel.metadata.duration,
            aspectRatio: reel.metadata.aspectRatio,
            cplId: cpl.id,
          },
        });
      }
    }

    return blocks.sort((a, b) => a.order - b.order);
  }

  private getReelOrder(reel: Entity): number {
    const reelType = this.getReelType(reel);
    return REEL_ORDER.indexOf(reelType) >= 0 ? REEL_ORDER.indexOf(reelType) : 999;
  }

  private getReelType(reel: Entity): string {
    const id = (reel.metadata.reelId as string)?.toLowerCase() || "";
    const label = reel.label.toLowerCase();

    if (id.includes("trailer") || label.includes("trailer")) return "trailer";
    if (id.includes("ad") || id.includes("advert") || label.includes("anúncio") || label.includes("publicidad")) return "advertisement";
    if (id.includes("feature") || id.includes("main") || label.includes("filme") || label.includes("principal")) return "feature";
    if (id.includes("credit") || label.includes("crédito")) return "credits";
    if (id.includes("inter") || label.includes("intervalo")) return "intermission";

    return "unknown";
  }

  reorder(blocks: TimelineBlock[], fromIndex: number, toIndex: number): TimelineBlock[] {
    const result = [...blocks];
    const [removed] = result.splice(fromIndex, 1);
    result.splice(toIndex, 0, removed);
    return result.map((block, index) => ({ ...block, order: index }));
  }

  toXml(blocks: TimelineBlock[], entities: Entity[]): string {
    const cpls = entities.filter((e) => e.type === "cpl");
    const reelsByCpl = new Map<string, TimelineBlock[]>();

    for (const block of blocks) {
      const cplId = block.metadata?.cplId as string;
      if (cplId) {
        const group = reelsByCpl.get(cplId) || [];
        group.push(block);
        reelsByCpl.set(cplId, group);
      }
    }

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<CompositionPlaylist xmlns="http://www.smpte-ra.org/schemas/429-7/2006/CPL">\n';

    for (const [cplId, cplBlocks] of reelsByCpl) {
      const cpl = cpls.find((c) => c.id === cplId);
      if (!cpl) continue;

      xml += `  <Id>${cplId}</Id>\n`;
      xml += `  <IssueDate>${new Date().toISOString()}</IssueDate>\n`;
      xml += `  <Issuer>${cpl.metadata.issuer || "HUB"}</Issuer>\n`;
      xml += `  <Signer>${cpl.metadata.signer || "HUB"}</Signer>\n`;

      for (const block of cplBlocks.sort((a, b) => a.order - b.order)) {
        xml += `  <Reel Id="${block.entityId}">\n`;
        xml += `    <MainPicture>\n`;
        xml += `      <EditRate>${block.metadata?.editRate || "24 1"}</EditRate>\n`;
        xml += `      <IntrinsicDuration>${block.metadata?.duration || "0"}</IntrinsicDuration>\n`;
        xml += `      <EntryPoint>0</EntryPoint>\n`;
        xml += `      <Duration>${block.metadata?.duration || "0"}</Duration>\n`;
        xml += `      <FrameRate>24 1</FrameRate>\n`;
        xml += `      <ScreenAspectRatio>${block.metadata?.aspectRatio || "1998 1080"}</ScreenAspectRatio>\n`;
        xml += `    </MainPicture>\n`;
        xml += `  </Reel>\n`;
      }
    }

    xml += "</CompositionPlaylist>";
    return xml;
  }

  validate(blocks: TimelineBlock[], entities: Entity[]): ValidationResult {
    const errors: ValidationError[] = [];
    const reels = blocks.filter((b) => b.metadata?.entityType === "reel");

    const hasFeature = reels.some((r) => this.getReelTypeFromBlock(r) === "feature");
    if (!hasFeature && reels.length > 0) {
      errors.push({
        blockId: "session",
        message: "Sessão sem filme principal (feature)",
        severity: "warning",
      });
    }

    const hasTrailer = reels.some((r) => this.getReelTypeFromBlock(r) === "trailer");
    if (!hasTrailer && reels.length > 1) {
      errors.push({
        blockId: "session",
        message: "Sessão sem trailers (recomendado pelo DCI)",
        severity: "warning",
      });
    }

    return {
      valid: errors.filter((e) => e.severity === "error").length === 0,
      errors,
    };
  }

  private getReelTypeFromBlock(block: TimelineBlock): string {
    return (block.metadata?.reelType as string) || "unknown";
  }
}

export const cinemaTimeline = new CinemaTimeline();