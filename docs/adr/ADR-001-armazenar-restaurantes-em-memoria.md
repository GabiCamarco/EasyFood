# ADR-001: Guardar os restaurantes em memória (primeira versão)

| | |
|---|---|
| **Status** | Aceita (substituída pelo ADR-002 e pelo ADR-003) |
| **Data** | 20/08/2026 |
| **Responsável** | Equipe EasyFood |

## O problema
A primeira versão da API da EasyFood só precisa de duas coisas: **listar** restaurantes e **cadastrar** novos. O produto está em fase de protótipo, e o que importa agora é conferir se o fluxo faz sentido antes de investir em uma arquitetura mais pesada.

## O que pesou na escolha
- Chegar rápido a algo que possa ser testado.
- Não depender de nenhuma infraestrutura nem de custo extra.
- Manter o código simples o bastante para ser descartado ou trocado depois.

## Opções avaliadas

| Opção | Ponto a favor | Ponto contra |
|---|---|---|
| **Array em memória** | Zero configuração, resposta imediata | Perde tudo ao reiniciar |
| Arquivo JSON | Sobrevive ao reinício | Leitura e escrita manuais, risco de corromper o arquivo |
| SQLite | Persistente e leve | Pede modelagem e ferramentas que ainda não são necessárias |
| PostgreSQL | Robusto | Exige servidor e configuração |
| MongoDB | Flexível | Exige servidor; o modelo ainda é simples demais para justificar |
| Firebase | Pronto para uso | Dependência externa e conta em provedor |

## Decisão
Os restaurantes ficam em um **array em memória** dentro da própria API, apenas nesta versão inicial.

## Por quê
Era o caminho mais curto para testar `GET` e `POST`: sem instalação, sem custo e sem nada para configurar. Para validar uma ideia, essa velocidade valia mais do que a durabilidade dos dados.

## O que ganhamos e o que pagamos

**Ganhos**
- Desenvolvimento mais rápido e testes simples de `GET` e `POST`.
- Pouca complexidade para quem está começando a entender o projeto.

**Custos**
- Todos os dados somem quando o servidor reinicia.
- Não funciona com mais de uma instância da aplicação.
- Não permite consultas elaboradas nem garante integridade entre dados.

## Quando voltar a este assunto
A decisão deve ser revista assim que qualquer um destes pontos aparecer:
1. O MVP for validado e o projeto seguir para produção.
2. Os dados precisarem sobreviver a reinícios e a novas versões publicadas.
3. O volume crescer além do que cabe com folga na memória.
4. Surgirem consultas mais complexas ou relações entre entidades.

## Observação
Esta é uma solução **provisória**. Antes de ir para produção, é preciso escolher uma forma de persistência, e essa escolha está registrada no **ADR-002**.
