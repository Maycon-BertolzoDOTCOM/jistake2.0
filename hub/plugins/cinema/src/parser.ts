import { EntityParserContribution, ParsedEntity, SanitizedResult, Entity } from "@hub/reactor-config";
import { DOMParser } from "xmldom";

interface CPLDocument {
  Id: string;
  IssueDate: string;
  Issuer: string;
  Signer: string;
  ReelList: Reel[];
}

interface Reel {
  Id: string;
  MainPicture: {
    EditRate: string;
    IntrinsicDuration: string;
    EntryPoint: string;
    Duration: string;
    FrameRate: string;
    ScreenAspectRatio: string;
  };
  MainSound: {
    EditRate: string;
    IntrinsicDuration: string;
    EntryPoint: string;
    Duration: string;
  };
  MainSubtitle?: {
    EditRate: string;
    IntrinsicDuration: string;
    EntryPoint: string;
    Duration: string;
  };
}

export class CinemaParser implements EntityParserContribution {
  canParse(file: Buffer, mime: string): boolean {
    if (mime === "application/xml" || mime === "text/xml") {
      const content = file.toString("utf-8");
      return content.includes("<CompositionPlaylist") || content.includes("<PackingList");
    }
    return false;
  }

  async parse(file: Buffer): Promise<ParsedEntity> {
    const content = file.toString("utf-8");
    const entities: Entity[] = [];

    if (content.includes("<CompositionPlaylist")) {
      const cpl = this.parseCPL(content);
      entities.push({
        id: cpl.Id,
        label: `CPL: ${cpl.Id.slice(0, 8)}...`,
        metadata: {
          type: "cpl",
          issueDate: cpl.IssueDate,
          issuer: cpl.Issuer,
          signer: cpl.Signer,
          reels: cpl.ReelList.map((r) => ({
            id: r.Id,
            duration: r.MainPicture.Duration,
            editRate: r.MainPicture.EditRate,
          })),
        },
        type: "cpl",
      });

      for (const reel of cpl.ReelList) {
        entities.push({
          id: `${cpl.Id}-reel-${reel.Id}`,
          label: `Reel: ${reel.Id.slice(0, 8)}...`,
          metadata: {
            type: "reel",
            cplId: cpl.Id,
            reelId: reel.Id,
            duration: reel.MainPicture.Duration,
            editRate: reel.MainPicture.EditRate,
            aspectRatio: reel.MainPicture.ScreenAspectRatio,
          },
          type: "reel",
        });
      }
    }

    if (content.includes("<PackingList")) {
      const pkl = this.parsePKL(content);
      entities.push({
        id: pkl.Id,
        label: `PKL: ${pkl.Id.slice(0, 8)}...`,
        metadata: {
          type: "pkl",
          issueDate: pkl.IssueDate,
          issuer: pkl.Issuer,
          signer: pkl.Signer,
          assets: pkl.AssetList,
        },
        type: "pkl",
      });
    }

    return {
      entities,
      metadata: {
        total: entities.length,
        source: "cinema-xml",
        parsedAt: new Date().toISOString(),
      },
    };
  }

  private parseCPL(xml: string): CPLDocument {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, "application/xml");

    const getText = (selector: string) => doc.querySelector(selector)?.textContent || "";

    const reels: Reel[] = [];
    const reelElements = doc.querySelectorAll("Reel");
    reelElements.forEach((reelEl: Element) => {
      reels.push({
        Id: reelEl.getAttribute("Id") || "",
        MainPicture: {
          EditRate: getText("MainPicture EditRate"),
          IntrinsicDuration: getText("MainPicture IntrinsicDuration"),
          EntryPoint: getText("MainPicture EntryPoint"),
          Duration: getText("MainPicture Duration"),
          FrameRate: getText("MainPicture FrameRate"),
          ScreenAspectRatio: getText("MainPicture ScreenAspectRatio"),
        },
        MainSound: {
          EditRate: getText("MainSound EditRate"),
          IntrinsicDuration: getText("MainSound IntrinsicDuration"),
          EntryPoint: getText("MainSound EntryPoint"),
          Duration: getText("MainSound Duration"),
        },
      });
    });

    return {
      Id: getText("Id"),
      IssueDate: getText("IssueDate"),
      Issuer: getText("Issuer"),
      Signer: getText("Signer"),
      ReelList: reels,
    };
  }

  private parsePKL(xml: string) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, "application/xml");

    return {
      Id: doc.querySelector("Id")?.textContent || "",
      IssueDate: doc.querySelector("IssueDate")?.textContent || "",
      Issuer: doc.querySelector("Issuer")?.textContent || "",
      Signer: doc.querySelector("Signer")?.textContent || "",
      AssetList: Array.from(doc.querySelectorAll("Asset")).map((a: Element) => ({
        Id: a.getAttribute("Id") || "",
        Type: a.getAttribute("Type") || "",
        Size: a.querySelector("Size")?.textContent || "",
        Hash: a.querySelector("Hash")?.textContent || "",
      })),
    };
  }

  sanitize(file: Buffer): SanitizedResult {
    const content = file.toString("utf-8");
    const removed: string[] = [];

    const sanitized = content
      .replace(/<!DOCTYPE[^>]*>/g, (match) => {
        removed.push("DTD removido");
        return "";
      })
      .replace(/<!ENTITY[^>]*>/g, (match) => {
        removed.push("Entidade removida: " + match.slice(0, 50));
        return "";
      });

    return {
      safe: true,
      sanitized: Buffer.from(sanitized, "utf-8"),
      removed,
    };
  }
}

export const cinemaParser = new CinemaParser();