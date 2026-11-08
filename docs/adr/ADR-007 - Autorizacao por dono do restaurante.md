# ADR-007: Só o dono gerencia o seu restaurante

| | |
|---|---|
| **Status** | Aceita |
| **Depende de** | ADR-004 |
| **Responsável** | Equipe EasyFood |

## O problema
O JWT (ADR-004) prova que quem faz a requisição está logado, mas isso não basta para o cardápio. Se só o token fosse exigido, **qualquer usuário cadastrado poderia adicionar pratos, trocar fotos ou apagar o cardápio de qualquer restaurante**. Além disso, o modelo `Restaurant` não tinha vínculo com quem o cadastrou, então o sistema não sabia quem poderia alterá-lo.

## O que pesou na escolha
- Cada usuário deve mexer apenas no que é seu.
- A mudança tem de ser pequena e aproveitar o JWT e os módulos existentes.
- A regra precisa valer mesmo para quem chamar a API diretamente, sem passar pela interface.

## Opções avaliadas

| Opção | Avaliação |
|---|---|
| Só JWT | Simples, mas deixaria qualquer usuário logado alterar qualquer restaurante |
| Perfis de acesso (administrador, restaurante) | Dá regras amplas, mas exige criar e administrar perfis e ainda ligar cada usuário ao seu restaurante; desproporcional agora |
| **Dono por restaurante (`ownerId`)** | Cada restaurante guarda quem o cadastrou, e só essa pessoa o gerencia |

## Decisão
Adotar o **dono por restaurante**, com estas regras:

- **Modelo:** `Restaurant` ganha o campo opcional `ownerId`, que aponta para `User`. É opcional para que os restaurantes antigos continuem válidos.
- **Preenchimento:** ao cadastrar, `ownerId` recebe o `id` do usuário **identificado pelo token** (`req.user.id`), nunca um valor enviado no corpo da requisição.
- **Quem pode o quê:** consultar o cardápio é público. Cadastrar e excluir pratos, enviar a foto de um prato e excluir o restaurante exigem token válido **e** ser o dono. Quem não é dono recebe `403`.
- **Onde fica a regra:** nos services (`getOwnedRestaurant`, `getOwnedDish` e `deleteRestaurant`), conforme a arquitetura em camadas. Os botões do frontend só escondem as ações de quem não é dono; a decisão final é sempre do servidor.
- **Envio de imagem:** um middleware confere a permissão **antes** do Multer, para recusar quem não é dono sem carregar o arquivo em memória. O service confere de novo, e cada camada protege a si mesma.
- **Restaurantes sem dono:** os criados antes desta decisão ficam com `ownerId` nulo e **ninguém pode alterá-los** até que um dono seja definido direto no banco. É o comportamento mais seguro.
- **Exclusão de restaurante:** é definitiva. O restaurante e seus pratos saem em uma única transação (tudo ou nada). As fotos só são apagadas do disco depois que o banco confirma, e uma falha nessa limpeza não desfaz a exclusão.

## Por quê
É a menor mudança que resolve o problema: um campo, uma comparação e um código de resposta (`403`). Reaproveita o JWT e a estrutura de módulos, sem perfis nem tabelas novas. Obter o dono pelo token, e não pelo corpo da requisição, impede que alguém se passe por outro usuário. Manter a verificação nos services deixa a regra em um só lugar, seja qual for a rota ou a interface.

## O que ganhamos e o que pagamos

**Ganhos**
- Cada usuário só altera o que é seu, mesmo diante de requisições enviadas direto à API.
- Simplicidade: sem perfis, sem permissões configuráveis, sem tabelas extras.
- Menos desperdício: checar antes do Multer evita processar arquivos de quem não tem permissão.
- Consistência: a exclusão em transação não deixa pratos órfãos.

**Custos**
- **Um responsável por restaurante:** não dá para dividir a gestão nem transferir a propriedade pela aplicação.
- **Sem administrador:** ninguém corrige ou remove restaurantes de outros, nem atribui dono aos antigos, a não ser alterando o banco.
- **Exclusão definitiva:** restaurante ou prato apagado não volta.
- **E-mail não verificado:** a confirmação de e-mail ainda não é exigida para gerenciar o cardápio (ADR-005).
- **Cadastro livre:** qualquer usuário logado pode criar restaurantes, pois não há perfil que diferencie quem pode.

## Quando voltar a este assunto
Se aparecer a necessidade de mais de um responsável por restaurante, de um perfil de administrador ou suporte, de transferir a propriedade, de recuperar itens excluídos (exclusão lógica) ou de exigir e-mail confirmado nas ações de escrita.
