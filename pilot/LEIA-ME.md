# Piloto manual — BeautyOps

> Objetivo deste diretório: **conseguir o primeiro encaminhamento real de ponta a ponta.**
> Não é um sistema. É um instrumento de pesquisa. Ele existe para produzir
> evidência, não para escalar.

## A meta

Não é preencher quatro abas. É:

1. Uma profissional **aceita** receber uma cliente de outra profissional;
2. Uma cliente **autoriza** a indicação;
3. O resultado é **acompanhado até o desfecho** — concluído ou não.

Tudo o mais é meio.

## Hierarquia de evidência

Registre sempre o **nível mais alto** alcançado. Interessamento não é
validação.

| # | `evidence_level` | Significado |
|---|---|---|
| 1 | `contatou` | Aceitou conversar. Interesse em conhecer. |
| 2 | `cadastrou` | Aceitou fornecer serviços e região. |
| 3 | `aceitou_receber` | **Aceita receber indicações de outras profissionais.** |
| 4 | `confirmou_disponibilidade` | Confirmou vaga para uma solicitação concreta. |
| 5 | `aceitou_indicacao` | Aceitou uma indicação específica. |
| 6 | `atendimento_confirmado` | O processo resultou em atendimento. |

**Níveis 1–5 não provam nada comercialmente.** Somente o 6 valida a hipótese.

> A pergunta 8 do roteiro (aceitaria receber indicações?) é a que separa
> entusiasmo de aceite real. Não aceite "ah, claro" como resposta.

## Duas confusões que o esquema impede

**Aceitar ≠ ter vaga.**
`accepting_referrals = yes` significa que a profissional aceita receber
indicações **em geral**. Não significa que há horário livre amanhã. Por isso
disponibilidade vive na aba `SERVICOS_DISPONIBILIDADE`, com data e janela —
nunca no cadastro da profissional.

**Atender na região ≠ trabalhar na região.**
`neighborhood` é onde ela **atende**. Não é onde ela **atende hoje**.

## Arquivos

```
pilot/
  LEIA-ME.md                        este arquivo
  ROTEIRO.md                        script de conversa
  CHECKLIST-48H.md                  o que fazer nas próximas 48 horas
  data/
    PROFISSIONAIS.csv               uma linha por profissional
    SERVICOS_DISPONIBILIDADE.csv    N linhas por profissional (serviço + janela)
    SOLICITACOES.csv                uma linha por pedido que não pôde ser atendido
    ENCAMINHAMENTOS.csv             uma linha por tentativa de encaminhamento
  restrito/
    LEIA-ME.md                      regra de acesso
    CONTATOS.csv                    nomes e telefones — NÃO VERSIONAR
```

Abra os `.csv` no Google Sheets, Excel ou LibreOffice. Uma linha de cabeçalho,
delimitador vírgula, UTF-8.

## Privacy

O esquema usa `provider_ref` e `client_ref` — identificadores opacos.
Nome e telefone ficam em `restrito/CONTATOS.csv`, que **não é versionado**.

Ao final da conversa, peça autorização explícita para:
- guardar os dados de contato;
- entrar em contato quando surgir uma oportunidade compatível.

Registre a autorização em `CONTATOS.contact_permission`. Sem ela, a linha
existe mas o contato não pode ser compartilhado.

Ao registrar um encaminhamento, o contato da cliente só vai para a
profissional indicada **depois** do consentimento. Registre o consentimento
antes em `SOLICITACOES.consent_status`.

**Cuidado com `notes`:** é o campo mais fácil de usar para PII por acidente.
Escreva observação operacional, não biografia.

## Métricas do piloto

Com 3–5 profissionais, são **evidências exploratórias**, não estimativas.
Não extrapole. Não prometa taxa de conversão.

| Métrica | Como contar |
|---|---|
| Profissionais contatadas | linhas em `PROFISSIONAIS` |
| Aceitaram participar | `evidence_level >= aceita_receber` |
| Dados operacionais completos | `accepting_referrals` preenchido **e** ao menos uma linha em `SERVICOS_DISPONIBILIDADE` |
| Solicitações reais | linhas em `SOLICITACOES` |
| Solicitações sem candidatos | `request_status = sem_candidato` |
| Encaminhamentos aceitos | `provider_decision = aceitou` **e** `client_decision = aceitou` |
| Atendimentos concluídos | `outcome = concluido` |
| Tempo de resposta | `provider_response_at - proposed_at` |

Motivos de falha — registre em `ENCAMINHAMENTOS.outcome` ou nas notas:

`servico_incompativel` · `localizacao_insuficiente` · `sem_vaga` ·
`recusa_profissional` · `recusa_cliente` · `sem_resposta`

## Revisão do contrato do ledger

Depois da coleta, revise o `docs/adr/004-capacity-ledger-contract.md` contra
o que foi **realmente** difícil de registrar. As colunas que ninguém preencheu
estão erradas ou não são necessárias — e isso só aparece com uso.

Não implemente o parser antes disso.

## Limites

- Encaminhamento é **humano**. Nenhuma automação decide ou executa.
- Sem compartilhamento de contato sem autorização.
- Não prometa que a rede funciona antes de verificar cobertura real.
- Não cadastre profissional fictício como se fosse real.
