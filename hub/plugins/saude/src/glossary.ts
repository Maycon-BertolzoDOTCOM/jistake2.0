import { GlossaryProviderContribution, GlossaryTerm } from "@hub/reactor-config";

const SAUDE_GLOSSARY: GlossaryTerm[] = [
  {
    term: "HL7",
    definition: "Health Level Seven. Conjunto de normas para troca de informações clínicas e administrativas. v2.x (pipe-delimited) é o mais usado no Brasil. v3 (RIM) e FHIR são evoluções.",
    category: "standard",
    related: ["HL7v2", "HL7v3", "FHIR", "Segmento", "Campo"],
  },
  {
    term: "HL7v2",
    definition: "Versão 2.x do HL7. Mensagens delimitadas por pipe (|). Estrutura: MSH (header) + segmentos (PID, PV1, ORC, OBR, OBX, etc.). Amplamente usado em integração hospitalar no Brasil.",
    category: "standard",
    related: ["MSH", "PID", "PV1", "ORC", "OBR", "OBX", "ACK"],
  },
  {
    term: "FHIR",
    definition: "Fast Healthcare Interoperability Resources. Padrão moderno (REST/JSON/XML) baseado em recursos (Patient, Encounter, Observation, etc.). R4 é a versão estável atual. Substitui gradativamente HL7v2/v3.",
    category: "standard",
    related: ["Resource", "Bundle", "REST", "JSON", "R4", "HL7v2"],
  },
  {
    term: "MSH",
    definition: "Message Header. Segmento obrigatório em toda mensagem HL7v2. Define delimitadores, aplicação/entidade remetente/destinatária, timestamp, tipo de mensagem, ID de controle, versão.",
    category: "segment",
    related: ["HL7v2", "Header", "Delimitadores"],
  },
  {
    term: "PID",
    definition: "Patient Identification. Segmento com dados do paciente: ID, nome, data de nascimento, sexo, endereço, telefone, CPF (CNS no Brasil). Sensível — LGPD.",
    category: "segment",
    related: ["HL7v2", "Patient", "LGPD", "Dados Sensíveis"],
  },
  {
    term: "PV1",
    definition: "Patient Visit. Segmento com dados do atendimento: tipo (internação/ambulatorial), localização, médico responsável, data/hora de admissão, convênio.",
    category: "segment",
    related: ["HL7v2", "Encounter", "Atendimento", "Convênio"],
  },
  {
    term: "ORC",
    definition: "Common Order. Segmento de pedido (exame, medicação, procedimento). Contém: número do pedido, status, quantidade, prioridade, solicitante, data/hora.",
    category: "segment",
    related: ["HL7v2", "Order", "OBR", "Exame", "Medicação"],
  },
  {
    term: "OBR",
    definition: "Observation Request. Segmento de detalhe do pedido: código do exame (LOINC/TUSS), descrição, amostra, data/hora coleta, observações clínicas.",
    category: "segment",
    related: ["HL7v2", "ORC", "Exame", "LOINC", "TUSS"],
  },
  {
    term: "OBX",
    definition: "Observation Result. Segmento de resultado: valor, unidade, intervalo de referência, flags (anormal/normal), método, data/hora resultado.",
    category: "segment",
    related: ["HL7v2", "Resultado", "LOINC", "Referência"],
  },
  {
    term: "MDM",
    definition: "Medical Document Management. Tipo de mensagem para documentos clínicos (laudos, notas, resumos). MDM^T02 = original document notification.",
    category: "message-type",
    related: ["HL7v2", "Laudo", "Documento", "PDF", "CDA"],
  },
  {
    term: "ADT",
    definition: "Admit Discharge Transfer. Família de mensagens para movimento do paciente: A01=admissão, A03=alta, A04=registro, A08=atualização. Base do fluxo hospitalar.",
    category: "message-type",
    related: ["HL7v2", "Paciente", "Movimento", "Encounter"],
  },
  {
    term: "PACS",
    definition: "Picture Archiving and Communication System. Arquiva e distribui imagens médicas (DICOM). Integração via HL7 (ORU/MDM) + DICOM (C-STORE, C-FIND, C-MOVE).",
    category: "system",
    related: ["DICOM", "Imagem", "Laudo", "HL7", "RIS"],
  },
  {
    term: "RIS",
    definition: "Radiology Information System. Gerencia agendamento, laudos, faturamento de radiologia. Emite HL7 (ORM, ORU, MDM) e comunica com PACS via DICOM.",
    category: "system",
    related: ["PACS", "Radiologia", "HL7", "DICOM", "Laudo"],
  },
  {
    term: "DICOM",
    definition: "Digital Imaging and Communications in Medicine. Padrão para imagens médicas. Serviços: C-STORE (armazenar), C-FIND (buscar), C-MOVE (mover), C-ECHO (teste).",
    category: "standard",
    related: ["PACS", "Imagem", "C-STORE", "C-FIND", "C-MOVE"],
  },
  {
    term: "ICP-Brasil",
    definition: "Infraestrutura de Chaves Públicas Brasileira. Hierarquia de autoridades certificadoras (AC Raiz, ACs, ARs). Emite certificados A1 (software, 1 ano) e A3 (token/cartão, 3 anos).",
    category: "security",
    related: ["Certificado", "A1", "A3", "AC", "AR", "CRL", "OCSP"],
  },
  {
    term: "Certificado A1",
    definition: "Certificado digital em arquivo (PFX/P12), validade 1 ano. Armazenado em software. Usado para assinatura de documentos, notas fiscais, laudos. Requer senha.",
    category: "security",
    related: ["ICP-Brasil", "A3", "PFX", "Assinatura", "Validade"],
  },
  {
    term: "Certificado A3",
    definition: "Certificado em hardware (token USB ou smart card), validade 3 anos. Chave privada nunca sai do dispositivo. Mais seguro. Usado para assinatura de laudos, prescrições.",
    category: "security",
    related: ["ICP-Brasil", "A1", "Token", "Smart Card", "Hardware"],
  },
  {
    term: "CRL",
    definition: "Certificate Revocation List. Lista de certificados revogados publicada pela AC. Verificação offline. Arquivo assinado. Tamanho pode ser grande.",
    category: "security",
    related: ["ICP-Brasil", "OCSP", "Revogação", "Validação"],
  },
  {
    term: "OCSP",
    definition: "Online Certificate Status Protocol. Verificação em tempo real do status do certificado (good/revoked/unknown). Mais leve que CRL. Requer conectividade.",
    category: "security",
    related: ["ICP-Brasil", "CRL", "Revogação", "Tempo Real"],
  },
  {
    term: "LOINC",
    definition: "Logical Observation Identifiers Names and Codes. Codificação padrão mundial para exames laboratoriais e observações clínicas. Obrigatório em OBX e Observation FHIR.",
    category: "coding",
    related: ["OBX", "Observation", "Exame", "Código", "FHIR"],
  },
  {
    term: "TUSS",
    definition: "Terminologia Unificada da Saúde Suplementar. Codificação ANS para procedimentos, materiais, medicamentos. Obrigatória em guias, faturamento e OBR no Brasil.",
    category: "coding",
    related: ["OBR", "Procedimento", "ANS", "Faturamento", "Guia"],
  },
  {
    term: "LGPD",
    definition: "Lei Geral de Proteção de Dados (Lei 13.709/2018). Regula tratamento de dados pessoais e sensíveis. HL7 PID/PV1 contêm dados sensíveis — anonimização/pseudonimização obrigatória em logs/testes.",
    category: "legal",
    related: ["PID", "Dados Sensíveis", "Anonimização", "Consentimento"],
  },
  {
    term: "CFM",
    definition: "Conselho Federal de Medicina. Regulamenta telemedicina, prontuário eletrônico, assinatura digital de laudos (Resolução CFM 2.299/2021). Certificado ICP-Brasil obrigatório.",
    category: "legal",
    related: ["Telemedicina", "Laudo", "Certificado", "Assinatura", "Prontuário"],
  },
];

export class SaudeGlossary implements GlossaryProviderContribution {
  getTerms(): GlossaryTerm[] {
    return SAUDE_GLOSSARY;
  }

  search(query: string): GlossaryTerm[] {
    const q = query.toLowerCase();
    return SAUDE_GLOSSARY.filter(
      (term) =>
        term.term.toLowerCase().includes(q) ||
        term.definition.toLowerCase().includes(q) ||
        term.category.toLowerCase().includes(q) ||
        term.related?.some((r) => r.toLowerCase().includes(q))
    );
  }
}

export const saudeGlossary = new SaudeGlossary();