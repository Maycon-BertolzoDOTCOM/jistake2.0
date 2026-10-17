import { GlossaryProviderContribution, GlossaryTerm } from "@hub/reactor-config";

const CINEMA_GLOSSARY: GlossaryTerm[] = [
  {
    term: "DCI",
    definition: "Digital Cinema Initiatives. Especificação técnica para projeção digital de cinema (resolução, taxa de frames, cor, áudio, segurança). Base para DCP.",
    category: "standard",
    related: ["DCP", "CPL", "PKL", "KDM", "Media Block"],
  },
  {
    term: "DCP",
    definition: "Digital Cinema Package. Pacote completo para exibição: CPL (playlist), PKL (lista de assets), assets MXF (imagem/som/legenda), KDM (chaves).",
    category: "standard",
    related: ["CPL", "PKL", "KDM", "MXF", "Asset"],
  },
  {
    term: "CPL",
    definition: "Composition Playlist. XML que define a ordem de reprodução: quais reels, em que sequência, com que timing. O 'roteiro' da sessão.",
    category: "format",
    related: ["DCP", "Reel", "PKL", "Timeline"],
  },
  {
    term: "PKL",
    definition: "Packing List. XML que lista todos os assets do DCP com hashes SHA-256 para verificação de integridade. O 'manifest' do pacote.",
    category: "format",
    related: ["DCP", "CPL", "Asset", "Hash", "Integridade"],
  },
  {
    term: "KDM",
    definition: "Key Delivery Message. XML criptografado que entrega a chave AES-256 para descriptografar assets. Endereçada ao certificado X.509 do Media Block. Tem janela de validade (ValidFrom/ValidTo).",
    category: "security",
    related: ["CPL", "Media Block", "Certificado", "AES-256", "RSA"],
  },
  {
    term: "Media Block",
    definition: "Hardware de segurança no projetor (ou servidor IMB) que armazena certificado privado, descriptografa KDMs e decodifica assets MXF. Certificado X.509 único por dispositivo.",
    category: "hardware",
    related: ["KDM", "Certificado", "Projetor", "IMB", "SMPTE-430"],
  },
  {
    term: "Reel",
    definition: "Unidade de reprodução no CPL. Referencia um asset MXF (imagem, som ou legenda) com metadados: EditRate, Duration, EntryPoint, FrameRate, AspectRatio.",
    category: "format",
    related: ["CPL", "Asset", "MXF", "Timeline"],
  },
  {
    term: "Asset",
    definition: "Arquivo MXF contendo essência (imagem JPEG2000, áudio PCM/WAV, legenda SMPTE-TT). Criptografado com AES-256 se o DCP for protegido.",
    category: "format",
    related: ["MXF", "JPEG2000", "PCM", "Criptografia", "PKL"],
  },
  {
    term: "MXF",
    definition: "Material eXchange Format. Container SMPTE-377 para essência de mídia profissional. Usado no DCP para imagem, som e legenda.",
    category: "format",
    related: ["Asset", "JPEG2000", "SMPTE"],
  },
  {
    term: "JPEG2000",
    definition: "Codec de imagem lossless/lossy usado no DCI (perfil DCI profile). 12 bits por componente, 4:4:4, até 250 Mb/s. Requisito DCI.",
    category: "codec",
    related: ["MXF", "DCI", "Imagem", "Compressão"],
  },
  {
    term: "SMPTE-429",
    definition: "Série de normas para DCP: 429-2 (PKL), 429-3 (Asset), 429-6 (Reel), 429-7 (CPL), 429-8 (Constraint), 429-9 (KDM), 429-10 (Stereo), 429-11 (Render).",
    category: "standard",
    related: ["DCP", "CPL", "PKL", "KDM", "Reel"],
  },
  {
    term: "SMPTE-430",
    definition: "Normas de projeção: 430-1 (Projector), 430-2 (IMB), 430-3 (KDM), 430-4 (Logging), 430-5 (2K), 430-6 (3D), 430-7 (HDR), 430-8 (HFR), 430-9 (IMB Security).",
    category: "standard",
    related: ["Media Block", "IMB", "Projetor", "KDM", "Logging"],
  },
  {
    term: "Trusted Device List",
    definition: "Lista de certificados X.509 (thumbprints) no KDM que define quais Media Blocks podem descriptografar aquela KDM. Um KDM pode autorizar múltiplos dispositivos.",
    category: "security",
    related: ["KDM", "Certificado", "Media Block", "Thumbprint"],
  },
  {
    term: "ValidFrom / ValidTo",
    definition: "Janela de validade da KDM (ISO 8601 UTC). Fora dessa janela, o Media Block recusa a descriptografia. Semáforo: verde (dentro), amarelo (≤7 dias), vermelho (expirado).",
    category: "security",
    related: ["KDM", "Semáforo", "Expiração", "Certificado"],
  },
  {
    term: "Facilidade de Entrega",
    definition: "Como o DCP chega ao cinema: HDD físico (CRU DX115), satélite, fibra (Terrestrial), download via Aspera/Signiant. O HUB pode integrar com APIs de entrega.",
    category: "ops",
    related: ["DCP", "Entrega", "Aspera", "Signiant", "Satélite"],
  },
  {
    term: "Ingest",
    definition: "Processo de copiar DCP do meio de entrega para o armazenamento do servidor/projetor, verificar hashes (PKL) e registrar no TMS (Theatre Management System).",
    category: "ops",
    related: ["DCP", "PKL", "Hash", "TMS", "Verificação"],
  },
  {
    term: "TMS",
    definition: "Theatre Management System. Software que agenda sessões, gerencia DCPs, KDMs, projetores e automação da sala. Exemplos: Arts Alliance, CineSys, Vista, DX. O HUB pode expor API para TMS.",
    category: "ops",
    related: ["Agendamento", "DCP", "KDM", "Projetor", "Automação"],
  },
  {
    term: "Sessão",
    definition: "Exibição programada: filme (CPL), horário, sala, projetor, KDM válida. Timeline visual no HUB = trailers → anúncios → filme → créditos → intervalo.",
    category: "ops",
    related: ["CPL", "KDM", "Projetor", "Timeline", "TMS"],
  },
];

export class CinemaGlossary implements GlossaryProviderContribution {
  getTerms(): GlossaryTerm[] {
    return CINEMA_GLOSSARY;
  }

  search(query: string): GlossaryTerm[] {
    const q = query.toLowerCase();
    return CINEMA_GLOSSARY.filter(
      (term) =>
        term.term.toLowerCase().includes(q) ||
        term.definition.toLowerCase().includes(q) ||
        term.category.toLowerCase().includes(q) ||
        term.related?.some((r) => r.toLowerCase().includes(q))
    );
  }
}

export const cinemaGlossary = new CinemaGlossary();