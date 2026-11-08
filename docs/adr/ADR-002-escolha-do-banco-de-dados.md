# ADR-002: SQLite como banco de dados da EasyFood

| | |
|---|---|
| **Status** | Aceita |
| **Substitui** | ADR-001 |
| **Responsável** | Equipe EasyFood |

## O problema
Com o array em memória (ADR-001), tudo o que era cadastrado desaparecia quando o servidor reiniciava. Precisávamos de uma persistência confiável, gravada em disco, sem transformar a infraestrutura do projeto em um problema à parte.

## O que pesou na escolha
- Os dados precisam sobreviver a reinícios.
- A instalação deve ser mínima: nada de servidor separado, Docker ou serviço em nuvem.
- Os dados são naturalmente relacionais (restaurantes, usuários, pratos).

## Opções avaliadas

| Opção | Por que ficou de fora (ou entrou) |
|---|---|
| PostgreSQL / MySQL | Sólidos, mas exigem um servidor rodando e configurado, o que é demais para o estágio atual |
| MongoDB | Voltado a documentos; os dados do projeto cabem bem em tabelas relacionadas |
| **SQLite** | Relacional, usa SQL padrão e guarda tudo em um único arquivo local |

## Decisão
A EasyFood passa a usar o **SQLite** como banco de dados. O arquivo fica em `prisma/dev.db`, indicado pela variável `DATABASE_URL` do `.env`.

## Por quê
O SQLite entrega o que importa de um banco relacional (SQL, tabelas, relações) sem precisar de um servidor próprio. Para um projeto desta escala, instalar e manter outro processo seria custo sem retorno. Como é um arquivo só, também é fácil copiar, zerar ou inspecionar o banco.

## O que ganhamos e o que pagamos

**Ganhos**
- Os dados cadastrados passam a sobreviver aos reinícios.
- Configuração quase nula: não há nada além do arquivo.
- Portabilidade: o banco inteiro cabe em um arquivo.

**Custos**
- Não é a melhor opção para escrita simultânea em grande volume.
- O acesso ao banco é assíncrono, e o código precisa tratar isso.

## Quando voltar a este assunto
Se a EasyFood passar a rodar em **vários servidores** (um arquivo local deixa de servir) ou receber muitas requisições concorrentes, a migração para um banco cliente-servidor, como o PostgreSQL, deve ser avaliada.
