# ADR-005: Brevo para envio de e-mails e confirmação de cadastro

| | |
|---|---|
| **Status** | Aceita |
| **Depende de** | ADR-004 |
| **Responsável** | Equipe EasyFood |

## O problema
Com o login por JWT funcionando (ADR-004), a EasyFood aceitava qualquer e-mail sem checar se ele pertencia mesmo à pessoa e não tinha como se comunicar com os usuários. Faltavam duas coisas: **confirmar o e-mail no cadastro** e **avisar sobre eventos do sistema** (boas-vindas ao cadastrar um restaurante e um aviso interno para a equipe comercial).

Como o envio depende de um serviço externo, também era preciso garantir que uma falha dele **não impedisse** o cadastro de usuários e restaurantes.

## O que pesou na escolha
- **Custo zero.**
- Envio por **API**.
- Encaixe na arquitetura em camadas (routes, controller e service).
- Poder enviar para **qualquer usuário**, e não só para o dono da conta do provedor.

## Opções avaliadas

| Opção | Avaliação |
|---|---|
| SMTP com Gmail/Outlook (Nodemailer) | Usa credenciais pessoais ou "senha de app", tem limites baixos, sofre bloqueios e mistura a identidade do projeto com uma conta pessoal |
| Resend | Plano gratuito de 3.000 e-mails por mês (máximo de 100 por dia), mas sem domínio próprio verificado só envia para o dono da conta |
| MailerSend | 500 e-mails por mês (100 por dia) e domínio de teste restrito; também pede domínio próprio para uso real |
| SendGrid e Mailgun | Hoje oferecem só período de teste, sem plano gratuito permanente |
| **Brevo (ex-Sendinblue)** | Plano gratuito permanente com 300 e-mails por dia, API REST transacional e verificação do remetente por e-mail, sem exigir domínio próprio |

## Decisão
Usar a **Brevo** pela sua **API REST**, chamada com o `fetch` nativo do Node.js, com estas regras:

- **Serviço compartilhado:** todo envio passa por `src/modules/shared/email.service.js`, que expõe `sendEmail({ to, toName, subject, header, body, footer })`. Nenhum outro módulo conhece a Brevo; trocar de provedor significa mexer só no `fetch` desse arquivo.
- **Nenhuma dependência nova:** o `fetch` do Node.js 18+ dispensa bibliotecas, e o `package.json` não muda.
- **Configuração por ambiente:** a chave e os dados do remetente ficam no `.env` (`EMAIL_API_KEY`, `EMAIL_FROM`, `EMAIL_FROM_NAME`, `APP_URL` e `COMMERCIAL_EMAIL`), descritos no `.env.example` e fora do controle de versão.
- **Remetente fixo, destinatário variável:** `EMAIL_FROM` é sempre o endereço verificado da EasyFood. O destinatário (`to`) é o e-mail de cada usuário, vindo do banco.
- **Confirmação de e-mail:** no cadastro, a API gera um token aleatório, grava apenas o **hash SHA-256** dele (`verifyToken`) com validade de 24 horas (`verifyTokenExp`) e envia um link para `GET /auth/confirm-email?token=...`. O link funciona uma única vez: ao ser usado, marca `emailVerified` como verdadeiro e apaga o token.
- **E-mail é ação secundária:** primeiro acontece a operação principal (criar usuário ou restaurante). O envio fica em um `try/catch`, e qualquer falha só é registrada no terminal, sem mudar a resposta da API.
- **Conteúdo protegido:** textos digitados por usuários (como o nome do restaurante) passam por `escapeHtml()` antes de entrar no HTML do e-mail.
- **Login não bloqueado:** nesta versão, entrar no sistema não exige e-mail confirmado.

## Por quê
A Brevo foi a única que reuniu os três requisitos: plano **gratuito permanente**, **API** e envio para **qualquer destinatário** sem comprar domínio. Seu limite de 300 e-mails por dia supera o das alternativas gratuitas e basta para o volume do projeto.

Usar HTTP puro evita dependências e mantém o serviço fácil de trocar. Isolar o envio em `shared` segue o princípio dos ADRs anteriores: os módulos de negócio dependem de uma interface simples (`sendEmail`), não de um fornecedor. Guardar só o hash do token, com validade curta, impede que um vazamento do banco exponha links válidos. Tratar o e-mail como ação secundária evita que a instabilidade de um serviço externo derrube funções essenciais.

## O que ganhamos e o que pagamos

**Ganhos**
- Custo zero e nenhuma dependência nova.
- Baixo acoplamento: trocar de provedor afeta um único arquivo.
- Cadastro resiliente: usuários e restaurantes são salvos mesmo quando o e-mail falha.
- A mesma `sendEmail()` atende confirmação, boas-vindas e aviso comercial, e serve para usos futuros, como recuperação de senha.
- O painel da Brevo mostra o ciclo de cada e-mail (enviado, entregue, aberto, clicado), o que ajuda no diagnóstico.

**Custos**
- **Limite diário:** são 300 e-mails por dia. Cada cadastro gasta 1 e cada restaurante cadastrado gasta até 2; acima disso os envios falham, sem afetar o cadastro.
- **Reputação do remetente:** com um endereço gratuito (Gmail), a Brevo avisa "Freemail domain is not recommended" e os e-mails podem ir para o spam. Para uso real, é preciso um domínio próprio autenticado (SPF, DKIM e DMARC).
- **Dependência externa:** o envio depende da disponibilidade e das regras da Brevo, que podem mudar.
- **Sem reenvio e sem fila:** se o e-mail falhar, o usuário fica sem o link, não há rota de reenvio e o envio é síncrono, dentro da requisição.
- **Confirmação sem efeito prático:** como o login não exige e-mail confirmado, `emailVerified` ainda não protege nada.
- **Aviso comercial fixo:** o destinatário do aviso interno vem de uma variável de ambiente, não de uma configuração do sistema.
- **Chave de API é um segredo:** quem a tiver envia e-mails em nome da EasyFood. Ela fica só no `.env`; se for exposta, deve ser revogada no painel da Brevo e substituída por uma nova.

## Quando voltar a este assunto
Na ida para **produção** ou ao passar de **300 e-mails por dia** (plano pago ou outro provedor, domínio próprio autenticado e envio em fila ou em segundo plano). Também se a Brevo mudar ou remover o plano gratuito, se surgir a necessidade de **bloquear o login até a confirmação**, de **reenviar a confirmação**, de **recuperar senha** ou de usar **modelos de e-mail gerenciados**, ou se o spam comprometer a entrega.
