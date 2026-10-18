# Roteiro de conversa — piloto de indicações

Duração: **5 a 10 minutos**. Não venda uma rede que ainda não existe.

---

## Abertura

> Oi! Estou estudando uma ideia para ajudar profissionais da área da beleza a
> aproveitarem melhor as oportunidades de atendimento.
>
> A proposta é simples: quando uma profissional não puder atender uma cliente,
> ela poderia indicar outra profissional de confiança que ofereça o serviço e
> tenha disponibilidade.
>
> Estou conversando com algumas profissionais para entender como isso
> funcionaria na prática, antes de desenvolver o sistema.
>
> Posso te fazer algumas perguntas rápidas sobre os serviços que você atende,
> seus horários e se teria interesse em participar de um teste inicial, sem
> compromisso?

**Aguarde o sim.** Sem ele, não prossiga.

---

## Perguntas

Não leia mecanicamente. Deixe a profissional explicar como trabalha.

| # | Pergunta | O que descobrimos |
|---|---|---|
| 1 | Quais serviços você oferece atualmente? | Serviços realmente disponíveis |
| 2 | Em quais bairros ou regiões você atende? | Área declarada |
| 3 | Você atende em endereço fixo, a domicílio ou nos dois? | Modalidade |
| 4 | Em quais dias e horários costuma atender? | Disponibilidade habitual |
| 5 | Como funciona quando uma cliente pede horário que você não tem? | Processo atual de demanda excedente |
| 6 | Você costuma indicar outra profissional nesses casos? | Comportamento que a rede facilitaria |
| 7 | Que critérios usaria para indicar outra profissional? | Confiança, especialidade, localização, preço, qualidade |
| 8 | **Você aceitaria receber indicações de clientes de outra profissional?** | **Aceite operacional — a mais importante** |
| 9 | Que informações precisaria conhecer antes de aceitar uma indicação? | Requisitos operacionais |
| 10 | O que faria você desistir de participar? | Barreiras reais |

### Sobre a pergunta 8

Interesse na ideia **não** equivale a aceitar encaminhamentos.

Procure um sim operacional. "Ah, claro, por quê não?" não basta. Pergunte:

> Você aceitaria receber hoje, na próxima semana?

Se houver hesitação, registre `evidence_level = cadastrou`, não
`aceitou_receber`. Falsificar esse campo contamina todo o piloto.

### Aprofundamento — só se ela aceitou participar

- Quais serviços está disposta a receber por indicação?
- Qual região consegue atender?
- Como confirma que tem horário disponível?
- Quanto tempo costuma levar para responder?
- Como prefere receber uma indicação?
- Aceita informar quando o atendimento foi concluído ou não aconteceu?

**Não presuma disponibilidade.** Ela pode trabalhar no bairro e ainda estar
lotada hoje. Disponibilidade só entra em `SERVICOS_DISPONIBILIDADE` com data
e janela reais.

---

## Encerramento

> Obrigada por me ajudar a entender como isso funciona na prática!
>
> Se você quiser participar do teste inicial, podemos registrar os serviços que
> oferece, a região em que atende e como confirmar sua disponibilidade antes de
> qualquer indicação.
>
> A ideia é começar de forma manual, com poucas profissionais, para verificar
> se o processo realmente ajuda. Não existe garantia de receber clientes nem
> obrigação de aceitar indicações.

Depois:

> Posso registrar essas informações e entrar em contato quando tivermos uma
> oportunidade compatível?

Registre a autorização em `CONTATOS.contact_permission`
(`autorizado` / `nao_autorizado`). Envie a mensagem final **apenas se** ela
demonstrou interesse.

---

## Registro imediato

Ainda durante ou logo após a conversa, preencha:

**`PROFISSIONAIS.csv`** — uma linha, com `provider_ref` sequencial
(`P001`, `P002`, …), `evidence_level`, `accepting_referrals`
(`yes` / `no` / `unknown`) e `recorded_at`.

**`SERVICOS_DISPONIBILIDADE.csv`** — uma linha por serviço que ela aceita
receber por indicação. Deixe `availability_status = declarada` por enquanto;
`confirmada` só quando a vaga for confirmada para um pedido concreto.

**`CONTATOS.csv`** (restrito) — nome, telefone, `contact_permission`.

### Se ela recusar

Registre mesmo assim, com `evidence_level = contatou` e `accepting_referrals = no`.
A objeção é informação valiosa: ela diz o que precisa mudar.

> Obrigada mesmo assim. Se algum dia a ideia fizer sentido, me chama.

Não insista.
