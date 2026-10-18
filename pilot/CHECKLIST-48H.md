# Próximas 48 horas

Não escreva código antes de começar a coleta.

## Passo 1 — Selecionar 5 profissionais

Legitimamente: quem você conhece, quem já conversou, quem respondeu mensagem.
Não é prospect frio — é pesquisa.

Busque um **mix**:

- quem costuma recusar horários (gera oportunidade)
- quem costuma ter agenda livre (recebe oportunidade)

Uma rede só de quem tem vaga não produz encaminhamento. Uma rede só de quem
está lotada não tem para quem indicar.

## Passo 2 — Abordar

Use `ROTEIRO.md`. 5 a 10 minutos cada.

## Passo 3 — Registrar tudo

Inclusive recusas. Uma recusa registrada é dado; uma recusa esquecida é viés.

Preencha `data/PROFESSIONAIS.csv` logo após cada conversa.

## Passo 4 — Confirmar operacionalmente

Para quem aceitou:

- [ ] serviços que aceita receber por indicação
- [ ] região que atende
- [ ] `accepting_referrals = yes` — e isso veio de um sim operacional, não de "ah claro"
- [ ] ao menos uma linha em `SERVICOS_DISPONIBILIDADE.csv`

## Passo 5 — Anotar o que foi difícil

Este passo é o mais valioso e o mais fácil de esquecer.

O que deu atrito durante a coleta?

- [ ] explicar o que é uma "indicação"?
- [ ] explicar que não há garantia de cliente?
- [ ] pedir autorização para guardar o número?
- [ ] profissional entendeu "alcance" como "onde atende"?
- [ ] alguma pergunta não fez sentido?
- [ ] algum campo do CSV ficou confuso?
- [ ] alguma informação foi impossível de obter?

Anote em `notes` da linha, ou me conte depois. Colunas que ninguém preencheu
estão erradas — e o `ADR-004` precisa saber disso antes do parser existir.

## Passo 6 — O primeiro encaminhamento

Quando surgir o primeiro caso real:

1. Abra a linha em `SOLICITACOES.csv`
2. Determine o consentimento **antes** de indicar alguém
3. Abra a linha em `ENCAMINHAMENTOS.csv` ao apresentar a indicação
4. Registre a resposta da profissional
5. Registre a resposta da cliente
6. Acompanhe até o desfecho em `outcome`

## Passo 7 — Revisar o contrato

Com os primeiros registros reais, revisamos `docs/adr/004-capacity-ledger-contract.md`.
Só depois disso vem o parser.

---

## O que esse piloto não é

- Não é teste de software. O software já tem 240 testes.
- Não é lançamento. Não anuncie a rede.
- Não é meta de crescimento. Três a cinco profissionais é **amostra de
  exploração**, e um encaminhamento concluído é **primeira evidência**, não
  modelo validado.

## Critério de sucesso

Uma profissional aceita uma cliente de outra profissional, a cliente autoriza,
e o desfecho é registrado.

Um encaminhamento. Só isso.
