# ADR-004: Login com JWT e senhas protegidas por bcrypt

| | |
|---|---|
| **Status** | Aceita |
| **Depende de** | ADR-002 e ADR-003 |
| **Responsável** | Equipe EasyFood |

## O problema
Depois da persistência em SQLite com Prisma, qualquer pessoa ainda conseguia cadastrar restaurantes, porque nenhuma rota pedia identificação. Era preciso cadastrar usuários, reconhecê-los nas requisições seguintes e proteger as rotas que gravam dados (`POST /restaurants`), mantendo a listagem (`GET /restaurants`) aberta ao público. A solução tinha de ser simples e combinar com a arquitetura em camadas já adotada (routes, controller e service).

## O que pesou na escolha
- Pouca infraestrutura nova.
- Senhas que não vazem em caso de acesso indevido ao banco.
- Uma API consumida por um frontend em JavaScript.
- Proteger uma nova rota com o mínimo de código.

## Opções avaliadas

| Opção | Avaliação |
|---|---|
| Sessão com cookie no servidor | Exige guardar sessões (memória, banco ou Redis), ou seja, mais estado e mais infraestrutura |
| HTTP Basic Auth | Manda e-mail e senha a cada requisição; sem expiração e sem identificação segura |
| Provedor externo (OAuth, Auth0, Firebase Auth) | Cria dependência e configuração desproporcionais para o momento |
| **JWT com Bearer Token** | A API devolve um token assinado, enviado no header `Authorization` |

## Decisão
Autenticar com **JWT** e guardar as senhas com **bcrypt**, seguindo estas regras:

- **Cadastro e login:** `POST /auth/register` cria o usuário. `POST /auth/login` confere as credenciais e devolve `{ token, user }`.
- **Senhas:** nunca ficam em texto puro. Só o hash do bcrypt (custo 10) é gravado, e o login compara com `bcrypt.compare()`.
- **Token:** assinado com `JWT_SECRET`, carrega o id do usuário (`sub`) e o e-mail, e vale por 1 dia.
- **Segredo:** vem da variável `JWT_SECRET` (`.env`), sem valor padrão no código. Sem ela, o servidor não inicia.
- **Proteção de rotas:** um middleware lê `Authorization: Bearer <token>`, valida o token e responde `401` se estiver ausente, inválido ou expirado.
- **Rotas protegidas:** `POST /restaurants` e `GET /auth/me`. Continuam públicas: `GET /restaurants`, `POST /auth/register` e `POST /auth/login`.
- **Erros padronizados:** `400` para campos obrigatórios ausentes, `409` para e-mail já cadastrado e `401` para credenciais inválidas, sem indicar se foi o e-mail ou a senha que falhou.

## Por quê
Com JWT a API fica **sem estado**: o servidor não guarda sessões, porque o próprio token, conferido pela assinatura, diz quem é o usuário. Isso preserva a simplicidade que motivou o SQLite e funciona bem com um frontend em JavaScript. O bcrypt usa hash lento e com salt, o que dificulta força bruta e impede que um vazamento do banco revele as senhas reais. Manter o segredo no `.env` evita que a chave de assinatura vá parar no controle de versão.

## O que ganhamos e o que pagamos

**Ganhos**
- Só usuários autenticados cadastram restaurantes; a consulta segue aberta.
- Sem sessões no servidor, o deploy é mais simples e a API pode crescer na horizontal.
- As senhas existem apenas como hash e nunca voltam nas respostas.
- O middleware protege novas rotas com uma única linha.

**Custos**
- **Sem revogação imediata:** o token vale até expirar (1 dia), mesmo após o logout. O botão "Sair" apenas descarta o token no navegador.
- **Segredo sensível:** se o `JWT_SECRET` vazar, qualquer pessoa forja tokens. Trocá-lo invalida todos os tokens existentes.
- **`localStorage`:** guardar o token ali o expõe a ataques de XSS. Serve para o escopo atual, mas não é o ideal em produção.
- **Autorização básica:** não há perfis, então qualquer usuário logado pode cadastrar restaurantes.
- **Sem limite de tentativas de login** e sem HTTPS no ambiente local.

## Quando voltar a este assunto
Ao precisar de perfis de acesso (administrador, dono de restaurante), de revogação imediata de sessões ou de refresh tokens, ao adotar login social ou vários serviços compartilhando a identidade, e na ida para produção (HTTPS obrigatório, cookies `httpOnly` no lugar do `localStorage` e limite de tentativas de login).
