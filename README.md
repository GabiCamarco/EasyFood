# EasyFood

API para consulta e cadastro de restaurantes e dos seus cardápios, com autenticação de usuários via JWT. Cada restaurante tem um dono, e só ele gerencia o cardápio. Os pratos podem ter foto, otimizada no próprio servidor, e o sistema envia e-mails (confirmação de cadastro, boas-vindas e avisos) pela Brevo. Este projeto está em fase de prototipação/validação: as decisões de arquitetura tomadas até aqui estão documentadas em `docs/adr/`.

## Stack

- Node.js + Express 5
- Prisma ORM + SQLite para persistência de dados
- JWT (`jsonwebtoken`) para autenticação
- `bcrypt` para hash de senhas
- `dotenv` para variáveis de ambiente
- Multer (recebe a imagem) + Sharp (redimensiona e converte para WebP)
- API REST da Brevo para e-mails, chamada com `fetch` (sem biblioteca extra)
- Frontend em HTML, CSS e JavaScript puros, servido pela própria API

## Estrutura do projeto

```
EASYFOOD/
├── prisma/
│   ├── schema.prisma          # Modelagem das tabelas (Restaurant, Dish, User)
│   ├── seed.js                # Script para popular o banco com dados de teste
│   └── migrations/            # Histórico de migrações do banco
├── public/
│   └── index.html             # Frontend servido pela API
├── uploads/                   # Fotos otimizadas dos pratos (não versionada)
├── src/
│   ├── app.js                 # Configuração do Express e das rotas
│   ├── server.js              # Ponto de entrada da aplicação
│   ├── lib/
│   │   └── prisma.js          # Instância compartilhada do PrismaClient
│   ├── middlewares/
│   │   └── authMiddleware.js  # Middleware de verificação de token JWT
│   └── modules/
│       ├── auth/              # Cadastro, login, /auth/me e confirmação de e-mail
│       ├── restaurants/       # Consulta, cadastro e exclusão de restaurantes
│       ├── dishes/            # Cardápio: pratos, foto e regras de dono
│       └── shared/
│           ├── email.service.js      # sendEmail(): único ponto de contato com a Brevo
│           ├── image.service.js      # Otimização (Sharp) e remoção de imagens
│           └── upload.middleware.js  # Multer: recebe a imagem e trata erros de upload
├── docs/
│   └── adr/                   # Registro das decisões arquiteturais (ADRs)
└── postman/                   # Coleções do Postman para testar a API
```

Cada módulo segue a arquitetura em camadas: **routes** (rotas), **controller** (requisição e resposta) e **service** (regras de negócio e acesso ao banco).

## Pré-requisitos

- Node.js 18 ou superior (a integração de e-mail usa o `fetch` nativo)
- npm

## Instalação

```bash
git clone <url-do-repositorio>
cd EASYFOOD
npm install
```

## Configuração

Crie um arquivo `.env` na raiz do projeto, a partir do modelo `.env.example`:

```bash
cp .env.example .env              # Linux/macOS
Copy-Item .env.example .env       # Windows (PowerShell)
```

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | Sim | Caminho do SQLite, relativo a `prisma/`. Ex.: `file:./dev.db` |
| `JWT_SECRET` | Sim | Chave que assina os tokens. A aplicação não sobe sem ela |
| `PORT` | Não | Porta do servidor (padrão: `3000`) |
| `EMAIL_API_KEY` | Para enviar e-mails | Chave de API da Brevo (começa com `xkeysib-`) |
| `EMAIL_FROM` | Para enviar e-mails | Remetente verificado na Brevo, igual para todos os e-mails |
| `EMAIL_FROM_NAME` | Não | Nome exibido como remetente (padrão: `EasyFood`) |
| `APP_URL` | Não | Endereço base do link de confirmação (padrão: `http://localhost:3000`) |
| `COMMERCIAL_EMAIL` | Não | Recebe o aviso de novo restaurante. Vazio, o aviso não é enviado |

Exemplo:

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="uma-chave-secreta-forte-aqui"

EMAIL_API_KEY="xkeysib-sua-chave-aqui"
EMAIL_FROM="remetente-verificado@exemplo.com"
EMAIL_FROM_NAME="EasyFood"
APP_URL="http://localhost:3000"
COMMERCIAL_EMAIL="comercial@exemplo.com"
```

As variáveis de e-mail não impedem a aplicação de subir: sem elas o cadastro continua funcionando, mas os e-mails falham e o erro aparece no terminal.

Para gerar um `JWT_SECRET` aleatório:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

> O `.env` guarda segredos e já está no `.gitignore`. Não o versione nem o envie (nem dentro de um .zip ou .rar).

### Configurando o e-mail (Brevo)

O plano gratuito permite 300 e-mails por dia.

1. Crie uma conta em [brevo.com](https://www.brevo.com/).
2. Em **SMTP & API > API Keys**, gere uma chave e copie-a na hora (ela só aparece uma vez). Use a aba **API Keys**, e não a SMTP.
3. Em **Senders, Domains & Dedicated IPs > Senders**, cadastre e verifique o remetente.
4. Preencha as variáveis de e-mail no `.env` e reinicie a aplicação, pois o `.env` só é lido ao iniciar.

Para **trocar a chave** depois, gere uma nova na Brevo, substitua `EMAIL_API_KEY` no `.env`, reinicie e **revogue a chave antiga** no painel. Uma chave que já foi enviada por chat, e-mail ou arquivo compactado deve ser considerada exposta.

E-mails enviados pelo sistema:

| Evento | Destinatário | Assunto |
|---|---|---|
| Cadastro de usuário | O novo usuário | Confirme seu e-mail na EasyFood |
| Cadastro de restaurante | Usuário logado | Bem-vindo à EasyFood, *nome do restaurante*! |
| Cadastro de restaurante | `COMMERCIAL_EMAIL` | Novo restaurante cadastrado: *nome do restaurante* |

Todos usam `sendEmail()`, em `src/modules/shared/email.service.js`. O e-mail é uma ação secundária: se o envio falhar, o usuário ou o restaurante continua salvo e o erro é registrado no terminal.

Com remetente de e-mail gratuito (Gmail, Outlook), a Brevo exibe "Freemail domain is not recommended" e os e-mails podem cair no spam. Se aparecer `401 unrecognised IP address`, autorize seu IP em **Authorised IPs** no painel.

## Banco de dados

Rode as migrações para criar o banco SQLite local (`prisma/dev.db`) com as tabelas do projeto:

```bash
npm run migrate
```

O arquivo `.db` não é versionado (está no `.gitignore`), então cada ambiente cria o seu. O banco nasce **vazio**, sem usuários nem restaurantes.

Opcionalmente, popule o banco com alguns restaurantes de exemplo (só insere se ainda não houver nenhum restaurante):

```bash
node prisma/seed.js
```

Os restaurantes de exemplo **não têm dono**: aparecem na lista e o cardápio deles pode ser consultado, mas ninguém pode alterá-los. Para testar o gerenciamento do cardápio, crie uma conta e cadastre o seu próprio restaurante.

Para consultar o banco (por exemplo, ver os e-mails cadastrados na tabela `User`):

```bash
npx prisma studio
```

## Executando o projeto

```bash
# modo produção
npm start

# modo desenvolvimento (reinicia sozinho a cada alteração)
npm run dev
```

Por padrão a API sobe em `http://localhost:3000` (ou na porta definida em `PORT`, se houver). A mesma porta serve o frontend.

> Acesse o frontend pelo endereço acima. Abrir o `index.html` direto do disco (`file:///...`) faz o navegador bloquear as chamadas à API.

## Frontend

A página em `http://localhost:3000` permite:

1. Criar conta ou entrar (você entra automaticamente depois de criar a conta e recebe um e-mail de confirmação).
2. Ver os restaurantes agrupados por categoria e filtrar por categoria.
3. Cadastrar restaurantes (exige login). O restaurante cadastrado passa a ser seu.
4. Abrir o cardápio de qualquer restaurante em **Ver cardápio**.
5. Nos restaurantes marcados como **Seu restaurante**: adicionar pratos, enviar ou trocar a foto (JPEG, PNG ou WebP, até 5 MB) e excluir pratos ou o restaurante, com confirmação antes.

O token fica guardado no `localStorage` do navegador. Os botões de gerenciamento só aparecem para o dono, mas quem aplica a regra é o servidor.

## Endpoints

### Autenticação (`/auth`)

| Método | Rota | Descrição | Autenticação |
|---|---|---|---|
| POST | `/auth/register` | Cria um novo usuário (`name`, `email`, `password`) e envia o e-mail de confirmação | Não |
| POST | `/auth/login` | Autentica o usuário e retorna um token JWT | Não |
| GET | `/auth/confirm-email?token=...` | Confirma o e-mail pelo link recebido (responde com uma página HTML) | Não |
| GET | `/auth/me` | Retorna os dados do usuário autenticado | Sim (Bearer token) |

### Restaurantes

| Método | Rota | Descrição | Autenticação |
|---|---|---|---|
| GET | `/restaurants` | Lista todos os restaurantes cadastrados | Não |
| POST | `/restaurants` | Cadastra um novo restaurante (`name`, `category`, `rating`). Quem cadastra vira o dono | Sim (Bearer token) |
| DELETE | `/restaurants/:id` | Exclui o restaurante, seus pratos e as fotos | Dono |

### Cardápio (pratos)

| Método | Rota | Descrição | Autenticação |
|---|---|---|---|
| GET | `/restaurants/:restaurantId/dishes` | Lista o cardápio de um restaurante | Não |
| POST | `/restaurants/:restaurantId/dishes` | Cadastra um prato (`name`, `description`, `price`) | Dono |
| POST | `/dishes/:dishId/image` | Envia a foto do prato (multipart, campo `image`) | Dono |
| DELETE | `/dishes/:dishId` | Exclui o prato e a foto | Dono |

Para acessar rotas protegidas, envie o token obtido no login no header:

```
Authorization: Bearer <token>
```

As rotas marcadas como **Dono** exigem, além do token, que o usuário logado seja o dono do restaurante. Caso contrário, a resposta é `403`. Restaurantes sem dono (como os do `seed.js`) não podem ser alterados por ninguém.

### Exemplos

Cadastrar um prato: `POST /restaurants/1/dishes` (com `Authorization`, apenas o dono)

```json
{
  "name": "Pizza Margherita",
  "description": "Molho de tomate, queijo e manjericão",
  "price": 49.90
}
```

O preço é devolvido como texto, e o SQLite não preserva zeros à direita (por exemplo, `"49.9"`).

Enviar a foto: `POST /dishes/1/image` (com `Authorization`, apenas o dono). O corpo é `multipart/form-data`, com o arquivo no campo `image` (JPEG, PNG ou WebP, até 5 MB). Não defina o `Content-Type` manualmente. No PowerShell:

```
curl.exe -X POST http://localhost:3000/dishes/1/image -H "Authorization: Bearer <token>" -F "image=@foto.jpg"
```

Só a versão otimizada é guardada (largura de até 800 px, em WebP), e o `imageUrl` do prato aponta para ela. Ao trocar a foto, a anterior é apagada. As imagens ficam públicas em `/uploads/dishes/<arquivo>.webp`.

### Códigos de resposta

| Código | Quando acontece |
|---|---|
| 200 | Consultas, login, envio de foto e confirmação de e-mail |
| 201 | Usuário, restaurante ou prato criado |
| 204 | Exclusão concluída (sem corpo). A exclusão é definitiva |
| 400 | Campos ausentes ou inválidos, imagem ausente ou inválida, ou link de confirmação inválido ou expirado |
| 401 | Token ausente, inválido ou expirado, ou credenciais incorretas |
| 403 | Usuário logado, mas que não é o dono do restaurante |
| 404 | Restaurante ou prato não encontrado |
| 409 | E-mail já cadastrado |
| 413 | Imagem acima de 5 MB |
| 500 | Erro interno do servidor |

## Fluxos

**Confirmação de e-mail**

```
POST /auth/register
   ↓
Gera token aleatório → grava só o hash (SHA-256) + validade de 24 h
   ↓
Cria o usuário no banco (operação principal)
   ↓
sendEmail() → API da Brevo (ação secundária: falha só é registrada)
   ↓
Usuário clica no link: GET /auth/confirm-email?token=...
   ↓
Token válido → emailVerified = true e token apagado (uso único)
```

Na versão atual, a confirmação do e-mail não é exigida para fazer login.

**Upload de imagem**

```
POST /dishes/:dishId/image
   ↓
verifyJWT → o token é válido?                    (401)
   ↓
ensureOwner → o usuário é dono do prato?         (404 / 403)
   ↓
Multer → recebe o arquivo em memória (até 5 MB)  (413 / 400)
   ↓
Sharp → gira, reduz para até 800 px e converte para WebP
   ↓
uploads/dishes/<uuid>.webp
   ↓
Prisma atualiza o imageUrl (a foto anterior é apagada)
```

A verificação de dono acontece **antes** do Multer, para recusar quem não tem permissão sem receber o arquivo.

**Regra de dono**

```
POST /restaurants   → ownerId = id do usuário do token (nunca do corpo da requisição)
   ↓
Rotas "Dono" → verifyJWT → service compara restaurant.ownerId com req.user.id
   ↓
Diferente (ou ownerId nulo) → 403
```

## Testando a API

O projeto inclui coleções do Postman em `postman/collections/`, prontas para importar e testar os endpoints.

## Decisões de arquitetura (ADRs)

As principais decisões técnicas do projeto estão documentadas em `docs/adr/`:

- **ADR-001**: armazenamento inicial dos restaurantes em memória (superada)
- **ADR-002**: escolha do SQLite como banco de dados
- **ADR-003**: adoção do Prisma ORM para acesso ao banco
- **ADR-004**: estratégia de autenticação (JWT + bcrypt)
- **ADR-005**: Brevo para envio de e-mails e confirmação de cadastro
- **ADR-006**: processamento de imagens dos pratos na própria API (Multer + Sharp)
- **ADR-007**: autorização por dono do restaurante

## Problemas comuns

| Sintoma | Causa provável | Solução |
|---|---|---|
| "Erro ao conectar com o servidor da API" | Página aberta como arquivo ou servidor parado | Rode `npm start` e acesse `http://localhost:3000` |
| `JWT_SECRET não definido no .env` | Variável ou arquivo `.env` ausente | Crie o `.env` e defina o `JWT_SECRET` |
| `Cannot find module ...` | Dependências não instaladas | Rode `npm install` |
| `EADDRINUSE` | Porta 3000 em uso | Encerre o outro processo ou defina outra `PORT` |
| Erro do Prisma sobre tabela inexistente | Migrations não aplicadas | Rode `npm run migrate` |
| `401` mesmo depois de logar | Token expirado ou `JWT_SECRET` alterado | Saia e entre de novo |
| "E-mail já cadastrado" ao repetir um teste | O usuário anterior continua no banco | Apague-o em `npx prisma studio` (tabela `User`) |
| `EMAIL_API_KEY e EMAIL_FROM precisam estar no .env` | Variáveis de e-mail ausentes ou servidor não reiniciado | Preencha o `.env` e reinicie |
| `Brevo respondeu 401: Key not found` | Chave incorreta (ou chave SMTP no lugar da de API) | Gere uma chave em **API Keys** e atualize o `.env` |
| `Brevo respondeu 400` citando o remetente | `EMAIL_FROM` não verificado | Verifique o remetente em **Senders** |
| Log diz "Enviado", mas o e-mail não chega | Spam ou remetente de e-mail gratuito | Confira o spam e **Transactional > Logs** na Brevo |
| `403` ao cadastrar prato, enviar foto ou excluir | O usuário não é o dono, ou o restaurante não tem dono | Confira a coluna `ownerId` da tabela `Restaurant` em `npx prisma studio` |
| `413` ao enviar foto | Arquivo acima de 5 MB | Envie uma imagem menor |
| "O arquivo enviado não é uma imagem válida" | Não é JPEG, PNG ou WebP de verdade (renomear a extensão não funciona) | Envie uma imagem real |

## Status do projeto

Protótipo em fase de validação. Antes de um eventual ambiente de produção, os pontos abaixo devem ser reavaliados (ver os critérios de revisão nas ADRs correspondentes):

- Servir por HTTPS e guardar o token em cookie `httpOnly`, em vez de `localStorage`.
- Limitar tentativas de login (rate limiting) e permitir a revogação de tokens JWT antes da expiração.
- Criar perfis de acesso (como administrador) e permitir mais de um responsável por restaurante.
- Guardar as imagens em armazenamento externo (como o S3), já que hoje ficam no disco do servidor.
- Trocar a exclusão definitiva por exclusão lógica, se for preciso recuperar restaurantes e pratos.
- Usar um domínio próprio autenticado (SPF, DKIM e DMARC) como remetente, exigir e-mail confirmado para entrar, criar o reenvio da confirmação e enviar e-mails em segundo plano (fila).
- Reavaliar a escalabilidade do banco de dados (SQLite) caso a aplicação rode em vários servidores.
