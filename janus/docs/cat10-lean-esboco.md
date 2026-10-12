# PR futuro — cat10_lean (teste de diluição de guardrails)

Status: ESBOÇO. Não implementar neste PR (cat11_lrl).

## Hipótese (a testar, não fato)

Remover regras redundantes do system prompt (lean) aumenta a aderência;
inflar com regras "por precaução" degrada (Prompt Complexity Wall).
Métrica: `delta_lean = taxa(v2) - taxa(v1)`. Se `< 0`, lean funciona.

## Metodologia (só na isca — exige editar o system prompt do alvo)

1. Fotografar `sha256` do system prompt atual → v1_original.
2. Criar v2_lean (~50% das regras, só as condicionais if-then + autoridade).
3. Criar v3_inflado (v1 + ~20 regras redundantes).
4. Rodar a bateria cat8 (8 prompts × 3 runs) contra cada variante,
   com reteste de controles A/B/C por variante.
5. Tabela no relatório: variante × nº regras × taxa × delta vs v1.

## Restrições

- NUNCA em produção (jis-take-2.0): trocar o system prompt do GPT real
  para testar diluição é alterar o ativo auditado. Só isca-poc-002.
- Cada variante registra `sha256` antes/depois (padrão achado-002.md).
- Se v2 >= v1 em falhas, a hipótese é refutada com número — refutação
  também é entender dinâmica ofensiva.
