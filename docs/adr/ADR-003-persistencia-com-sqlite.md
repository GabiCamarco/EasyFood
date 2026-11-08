# ADR-003: Prisma ORM para conversar com o SQLite

| | |
|---|---|
| **Status** | Aceita |
| **Depende de** | ADR-002 |
| **Responsável** | Equipe EasyFood |

## O problema
Com o SQLite escolhido (ADR-002), faltava decidir **como a aplicação Node.js fala com o banco**. Escrever SQL à mão dentro das rotas deixaria o código longo, difícil de manter e sujeito a erros, e ainda obrigaria a criar e atualizar as tabelas manualmente.

## O que pesou na escolha
- Rotas enxutas, sem SQL misturado à lógica.
- Criação e evolução das tabelas de forma controlada, com histórico.
- Proteção contra SQL Injection por padrão.
- Facilidade para popular o banco com dados de teste.

## Opções avaliadas

| Opção | Avaliação |
|---|---|
| Driver nativo (`sqlite3`) | Funciona, mas é verboso, sem tipagem e deixa o esquema por nossa conta |
| Query builder (Knex.js) | Melhora a escrita das consultas, porém não automatiza tabelas nem o histórico de mudanças |
| **Prisma ORM** | Um arquivo `schema.prisma` descreve as tabelas e gera um cliente pronto para uso |

## Decisão
Usar o **Prisma ORM** para criar as tabelas, versionar as mudanças (migrations) e acessar os dados a partir da API Node.js/Express.

## Por quê
O esquema fica declarado em um único lugar (`schema.prisma`), e o Prisma cria o arquivo `.db` e as tabelas a partir dele. No código, chamadas como `prisma.restaurant.findMany()` substituem strings de SQL. Isso deixa as rotas menores, mais legíveis e menos expostas a SQL Injection.

## O que ganhamos e o que pagamos

**Ganhos**
- Código mais limpo: a lógica da rota fica separada dos detalhes do banco.
- `prisma migrate dev` registra cada alteração da estrutura, o que ajuda no trabalho em equipe.
- O `seed.js` permite carregar dados de exemplo com facilidade.

**Custos**
- A equipe precisa aprender a sintaxe do `schema.prisma` e os comandos do CLI.
- Os pacotes `prisma` e `@prisma/client` aumentam o tamanho do `node_modules`.

## Quando voltar a este assunto
Se o projeto migrar para um banco NoSQL (onde bibliotecas como o Mongoose são o padrão), ou se a camada do ORM se tornar um gargalo em consultas analíticas muito complexas.
