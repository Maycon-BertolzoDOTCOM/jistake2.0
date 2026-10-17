# Copy Lab — SaúdeOps

## Headlines

- **"Clínica pequena, integração grande"**
- **"HL7v2/FHIR sem servidor de integração"**
- **"Certificado ICP-Brasil: válido = assina laudo, expirado = bloqueia tudo"**

## Value Props

1. **Parser HL7v2/FHIR** — `@campfhir/hl7` (v2.3 & v2.5.1) + `fhir` (R4), sanitização LGPD
2. **Timeline de atendimento** — Triagem → Consulta → Exames → Laudo → Prescrição → Alta
3. **Validação Certificado Digital** — A1 (arquivo, 1 ano) / A3 (token/cartão, 3 anos), CRL/OCSP
4. **Ações clínicas** — Assinar laudo, enviar PACS (DICOM), validar certificado, gerar HL7

## Technical Differentiators

- **LGPD by design**: PID/PV1 sanitizados automaticamente (nome, DOB, localização → `[REDACTED]`)
- **ICP-Brasil native**: Verifica CRL/OCSP, semáforo: verde (válido), amarelo (≤30 dias), vermelho (expirado/revogado)
- **CFM compliant**: Assinatura digital de laudos (Resolução CFM 2.299/2021)
- **PACS/DICOM ready**: C-STORE, C-FIND, C-MOVE via integração HL7 (ORU/MDM) + DICOM
- **TUSS/LOINC mapping**: Procedimentos (TUSS) e exames (LOINC) em OBX/Observation

## Use Cases

- **Clínica 1-3 médicos**: Recebe HL7 do PACS/RIS, valida certificado, assina laudo digital
- **Laboratório**: Emite ORU^R01 com resultados codificados LOINC, envia para sistema do cliente
- **Telemedicina**: Gera FHIR Bundle (Patient + Encounter + Observation + DiagnosticReport)
- **Faturamento**: DFT^P03 com códigos TUSS, validação de guia/convenio

## Portfolio Bullets

- Parser HL7v2 (v2.3/v2.5.1) + FHIR R4 com sanitização LGPD automática
- Timeline de atendimento: Triagem → Consulta → Exames → Laudo → Alta
- Validação certificados ICP-Brasil A1/A3 com CRL/OCSP + semáforo 30 dias
- Ações: Assinar laudo (CFM 2.299), Enviar PACS (DICOM), Gerar HL7/FHIR
- Glossário saúde: 25+ termos (HL7, FHIR, PACS, RIS, DICOM, LGPD, CFM, TUSS, LOINC)