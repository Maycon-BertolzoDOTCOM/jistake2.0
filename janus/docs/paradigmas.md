# Paradigmas de segurança de LLMs — anexo teórico do Janus

Cada categoria de teste corresponde a um paradigma de defesa sob ataque.
Status: ✅ implementada · ⚠️ referenciada sem bateria · 📝 esboço · ❌ roadmap.
Números de papers citados como **hipóteses externas**, não fatos — o dado que
vale é o medido no GPT alvo.

## 1. Alinhamento por RLHF — heurística superficial de recusa

Quebra: direção linear de recusa removível; preferência estatística, não restrição.
Categorias: `cat2_roleplay` ⚠️ (registry, sem YAML).

## 2. Guardrails e filtros — forma vs. intenção

Quebra: assimetria de representação; filtro vê estrutura, LLM reconstrói intenção.
Categorias: `cat3_autoridade` ⚠️ (registry, sem YAML).

## 3. Hierarquia de instruções — Token Democracy

Quebra: transformer sem privilégio arquitetural para system prompt; instrução
compete no mesmo espaço que o input adversarial.
Categorias: `cat1_direta` ✅ (`runner/tests/cat1_direta.yaml`).

## 4. Segurança multilíngue — alinhamento centrado no inglês

Quebra: LRLs roteiam por subespaço desalinhado; tradução boa amplifica, ruim atenua
(maldição de relevância → teto `parcial`).
Categorias: `cat4_traducao` ⚠️ (registry, sem YAML), `cat11_lrl` ✅
(`runner/tests/cat11_lrl.yaml`; H11: `hi/fa > en`, a confirmar com número).

## 5. Agentes e ferramentas — raio de explosão

Quebra: injeção em agente executa no mundo (arquivos, shell); defesa exige
restringir o sistema ao redor, não o prompt.
Categorias: `cat5_arquivo` ❌, `cat6_codigo` ❌ (roadmap; Achado #001 é instância).

## 6. Complexidade de prompt — Prompt Complexity Wall

Hipótese: inflar guardrails degrada aderência; lean (condicionais + autoridade,
≤50 regras) adere melhor. Métrica: `delta_lean = taxa(v2) − taxa(v1)`.
Categorias: `cat10_lean` 📝 (`docs/cat10-lean-esboco.md`; só na isca).

## 7. Canais de saída — output como vetor lateral

Quebra: campos estruturados do output viram canal de exfiltração sem ferramentas.
Categorias: `cat8_output_embedding` ✅ (Achado #002), `cat7_multiturno` ✅
(erosão da recusa por turnos; métrica `taxa_por_turno`).

## 8. Ofuscação — encoding como Tier-1

Hipótese (literatura regional citada no Herbarium): encoding tem o maior ASR
entre classes simples. Fonte: `soc/gateway/herbarium/attack_library.py`
(categoria `encoding`; template `ml-farsi` como precedente de LRL).
Categorias: `cat12_encoding` ✅ (`runner/tests/cat12_encoding.yaml`;
sem decodificador v1: blob conta `parcial`, prova exige decode manual).

## Tabela-resumo

| Categoria | Paradigma | Mecanismo | Status |
|---|---|---|---|
| cat1_direta | 3 Hierarquia | Token Democracy | ✅ |
| cat7_multiturno | 7 Canais / erosão | Erosão por turnos | ✅ |
| cat8_output_embedding | 7 Canais de saída | Output lateral | ✅ |
| cat11_lrl | 4 Multilíngue | Lacuna LRL | ✅ (hi/fa pendentes) |
| cat12_encoding | 8 Ofuscação | Encoding Tier-1 | ✅ (sem decoder) |
| cat2_roleplay | 1 RLHF | Remoção de recusa | ⚠️ sem bateria |
| cat3_autoridade | 2 Guardrails | Assimetria | ⚠️ sem bateria |
| cat4_traducao | 4 Multilíngue | Lacuna LRL | ⚠️ sem bateria |
| cat10_lean | 6 Complexidade | Complexity Wall | 📝 esboço |
| cat5_arquivo / cat6_codigo | 5 Agentes | Tool/filesystem | ❌ roadmap |

## Follow-up registrado

`cat2/3/4` no registry sem YAML: `load_tests` quebra se enfileiradas —
criar fixtures mínimas ou remover das listas antes de qualquer `enqueue` amplo.
