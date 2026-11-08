# ADR-006: Otimizar as fotos dos pratos dentro da própria API

| | |
|---|---|
| **Status** | Aceita |
| **Responsável** | Equipe EasyFood |

## O problema
Com o cardápio, cada prato pode ter uma foto. As imagens enviadas costumam vir de celulares e câmeras, com vários megabytes e milhares de pixels de largura. Entregá-las como chegam deixaria a página lenta e gastaria os dados de quem consulta o cardápio.

A EasyFood precisa, portanto, receber a imagem, reduzi-la, convertê-la para um formato leve e guardar só a versão otimizada. O contexto é acadêmico, com pouca demanda, e a API Node.js/Express já é um monólito modular.

## O que pesou na escolha
- Não adicionar peças de infraestrutura para instalar e vigiar.
- Volume baixo de envios.
- Reaproveitar servidor, banco e módulos existentes.
- Mostrar a decisão e suas consequências, e não operar em grande escala.

## Opções avaliadas

| Opção | Avaliação |
|---|---|
| **Dentro da API** | A própria API recebe o arquivo (Multer), otimiza (Sharp) e grava em disco; tudo no mesmo servidor e no mesmo código |
| Microsserviço de imagens | Isolaria o uso de CPU, mas exigiria outro projeto para publicar, comunicação entre serviços e tratamento das falhas dela |
| Serverless/FaaS | Escala sozinho e não pesa na API, porém pede conta em provedor, armazenamento externo (como S3), permissões e um fluxo de eventos |

## Decisão
O processamento de imagens fica **dentro da API EasyFood**, com:

- **Multer** para receber o arquivo em memória, com limite de 5 MB e um arquivo por requisição. Aceita apenas JPEG, PNG e WebP.
- **Sharp** para corrigir a orientação, limitar a largura a 800 pixels (sem ampliar imagens menores) e converter para WebP com qualidade 80.
- O módulo compartilhado `src/modules/shared/image.service.js`, que poderá servir a logotipos de restaurantes e outras imagens no futuro.
- Armazenamento local em `uploads/dishes/`, com nome gerado por UUID. O caminho da imagem otimizada vai para o campo `imageUrl` do prato.

Não serão criados microsserviços, filas nem funções Serverless neste momento.

## Por quê
- **Simplicidade:** nada novo para instalar, configurar ou monitorar.
- **Volume baixo:** poucos envios, em ritmo calmo, que a API comporta.
- **Reaproveitamento:** usa servidor, banco e módulos que já existem.
- **Implementação curta:** duas bibliotecas e um serviço compartilhado resolvem o problema.
- **Contexto acadêmico:** o foco é justificar a escolha, não escalar.

A validação do arquivo também é simples: o `mimetype` informado pelo cliente pode ser falso, mas o Sharp só processa o que for realmente uma imagem, e um arquivo inválido é recusado com `400`. Como a imagem é regravada, os metadados originais (por exemplo, o GPS de fotos de celular) não vão para o arquivo final.

## O que ganhamos e o que pagamos

**Ganhos**
- Menos componentes para configurar e entender.
- Nenhum custo ou conta adicional.
- O serviço compartilhado atende outros módulos sem duplicar código.
- Imagens menores melhoram o carregamento e o consumo de dados.

**Custos**
- **CPU e memória da API:** cada envio ocupa até 5 MB de memória e é processado no mesmo processo que atende as demais requisições.
- **Possível lentidão:** vários envios ao mesmo tempo podem atrasar outras rotas.
- **Disco local:** as imagens ficam no servidor. Com várias instâncias ou disco temporário, seria preciso um armazenamento externo, como o S3.
- **Imagens públicas:** os arquivos em `/uploads` abrem para qualquer pessoa que conheça o endereço.

Para reduzir esses riscos, adotamos o limite de 5 MB, um arquivo por requisição, um teto de pixels na leitura (proteção contra arquivos pequenos que ficam enormes ao serem decodificados) e a checagem de permissão **antes** de receber o arquivo (veja o ADR-007).

## Quando voltar a este assunto
Se o volume de imagens crescer, se a API passar a rodar em várias instâncias ou em disco temporário, se o processamento começar a afetar o tempo das outras rotas, ou se for preciso gerar várias versões de cada imagem (miniaturas) ou servi-las por uma CDN.

Esta decisão não diz que Serverless seja inadequado; diz apenas que, agora, outra alternativa atende melhor.
