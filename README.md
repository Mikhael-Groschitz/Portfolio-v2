# Portfolio-v2

A segunda versão do meu portfólio, agora com cara de SQL Server Management Studio.

Sou engenheiro de dados e trabalho com SQL Server todo dia, então resolvi contar a minha trajetória do jeito que eu mais conheço: como um banco de dados. Cada seção do site é uma tabela. Você clica nela no Object Explorer, o script abre e o resultado aparece na grade. Nenhum SQL roda de verdade, é tudo simulado em TypeScript.

No ar em [mgroschitz.dev](https://mgroschitz.dev). A versão anterior continua em [mgroschitz.dev/v1](https://mgroschitz.dev/v1).

## O que tem no site

- Tela de conexão, Object Explorer, abas, grade de resultados e mensagens, como no SSMS
- Nova Consulta com destaque de sintaxe, autocomplete e o comando `HELP`
- Colinha e um tour rápido para quem não conhece SQL
- Português na raiz e inglês em `/en`, cada página com o próprio título e descrição
- Dá para usar só no teclado, com leitor de tela e no celular
- Alguns segredos escondidos, entre eles um mini jogo e uma viagem no tempo até a v1

## Stack

- Next.js 16 (App Router) e TypeScript
- CSS Modules
- Shiki para o destaque de sintaxe
- Vitest, ESLint e Prettier
- Vercel

## Rodando localmente

Precisa do Node.js 20.9 ou mais novo.

```powershell
git clone https://github.com/Mikhael-Groschitz/Portifolio-v2.git
cd Portifolio-v2
npm install
npm run dev
```

O site abre em `http://localhost:3000`. Outros comandos: `npm run build`, `npm run start`, `npm run lint`, `npm run typecheck` e `npm run test`.

A viagem no tempo usa duas variáveis. Se quiser testar, copie o `.env.example` para `.env.local` e preencha:

- `NEXT_PUBLIC_V1_URL`: para onde a viagem leva (em produção, `https://mgroschitz.dev/v1`)
- `V1_ORIGIN`: o projeto da v1 na Vercel, para onde o `/v1` é repassado (`https://mgroschitz.vercel.app`)

Sem elas o site funciona normalmente, só a viagem fica fora do ar.

## Estrutura

- `src/content`: todos os textos do site, em português e inglês. Texto que cita tecla, atalho ou mouse tem também uma versão para toque, e um teste falha se ela faltar
- `src/engine`: o "banco de dados" que executa as consultas, sem React
- `src/theme`: as cores do tema, em `tokens.css`
- `src/components`: a janela do SSMS e tudo que aparece nela
- `src/game`: o mini jogo, que só é baixado quando alguém abre
- `src/app`: as rotas, com o português na raiz e o inglês em `/en`
- `src/proxy.ts`: escolhe o idioma na primeira visita

## O mini jogo

O Symphony of the Database é uma campanha de seis fases e três chefes, e quase tudo nele é dado. Os números ficam todos em `src/game/balance.ts`.

- **Fase:** o mapa é uma lista de textos em `src/game/levels/rooms.ts`, um caractere por bloco (`#` pedra, `=` ressalto, `%` setor que cai, `<` e `>` esteiras, `-` e `_` plataformas agendadas, `|` feixe de teste, letras para inimigos e itens; a lista completa está em `levels/level.ts`). Depois é só pôr a fase em `CAMPAIGN`, no `levels/campaign.ts`, com a música e os reforços. A cor das paredes de cada fase fica em `render/stage-art.ts`
- **Inimigo:** uma entrada em `ENEMY_TRAITS` (`entities/enemy.ts`) com tamanho, vida e dano, o comportamento num arquivo próprio em `entities/` registrado em `ENEMY_UPDATES` (`core/world.ts`) e o desenho em `ENEMY_DRAWERS` (`render/entities.ts`)
- **Item:** o tipo e o efeito em `entities/items.ts`, a letra do mapa em `levels/level.ts`, a arte em `render/item-art.ts` e o aviso que aparece ao pegar em `ui/texts.ts`
- **Chefe:** a máquina de estados num arquivo em `entities/`, registrada em `BEHAVIORS` (`entities/boss.ts`), e o desenho em `render/bosses.ts`
- **Comando:** as teclas em `ACTION_KEYS` e a linha em `COMMANDS` (`core/commands.ts`), com o texto em `ui/texts.ts`. A lista da tela de título e o painel de comandos saem desse mapa, então não tem lista para manter à mão

Os testes conferem os mapas: a saída e todos os itens precisam ser alcançáveis com o pulo do Admin, nenhum item pode ficar encostado em parede ou plataforma, e não pode existir buraco sem volta. Com `npm run dev`, a tecla F9 abre um painel para pular de fase, ligar RAM infinita e abrir uma sala de teste. Esse painel não vai para o build de produção.

## Ranking do jogo

O mini jogo guarda os 10 melhores tempos num PostgreSQL acessado pelo Prisma. Só o servidor fala com o banco, e o jogo funciona normalmente sem ele.

Em tela larga, o ranking fica à esquerda do jogo e os comandos à direita. Quando falta espaço, os dois viram botões embaixo ou ao lado do jogo, e abrir um deles (ou apertar T, no caso do ranking) pausa a partida. O jogo lê o ranking uma vez ao abrir e não consulta de novo sozinho.

Quando a campanha começa, o jogo pede um token à API. Na vitória, se o tempo entra no top 10, aparece "Novo recorde!" com três letras para digitar, como nos fliperamas, e a linha nova fica destacada no painel. O tempo enviado é o mesmo da tela de vitória, em milissegundos. Sem rede ou sem banco, a partida segue normal e só fica fora do ranking.

- `src/ranking`: as regras do ranking (ordem, entrada no top 10, nome, tempo e o formato da exportação), sem banco e sem React
- `src/server`: código só de servidor. `env.ts` carrega as variáveis, `db/` cria o cliente do Prisma (o cliente gerado fica em `db/generated`, fora do git) e `ranking/` tem o armazenamento, em memória e no Prisma, e a lógica da CLI
- `prisma/`: o esquema e as migrações, que vão para o git
- `scripts/ranking.ts`: a CLI de manutenção

### Privacidade

O ranking não usa conta, cookie nem analytics. No banco ficam só três tabelas:

| Tabela              | O que guarda                                                    | Por quanto tempo                                                                   |
| ------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `leaderboard_entry` | Nome de três letras, tempo em milissegundos e data do envio     | Enquanto estiver entre os 10 melhores. Quem sai do top 10 é apagado no mesmo envio |
| `used_token`        | O id aleatório de cada partida enviada e a validade do token    | Até o token vencer, 2 horas depois do início da partida                            |
| `rate_limit`        | Um hash do IP feito com o segredo do ambiente, mais um contador | Até a janela de 1 hora fechar                                                      |

Nome e tempo ficam visíveis para todo mundo, e a tela avisa isso antes de salvar. O IP nunca chega ao banco, só o hash. As linhas vencidas de `used_token` e `rate_limit` saem na limpeza que acompanha os envios (no máximo uma vez a cada 10 minutos por servidor) ou com `npm run ranking -- purge --apply`. Os logs do servidor dizem só se o ranking está desligado ou se o banco falhou, com o código do erro, sem endereço, senha ou corpo de requisição.

### Ambientes

| Ambiente | Banco                                                  | Onde ficam as variáveis   |
| -------- | ------------------------------------------------------ | ------------------------- |
| Local    | Postgres 17 no Docker, na porta 5433 e só em 127.0.0.1 | `.env.local`              |
| Preview  | Prisma Postgres, num banco só dele                     | Vercel, escopo Preview    |
| Produção | Prisma Postgres, num banco só dele                     | Vercel, escopo Production |

`DATABASE_URL` é a conexão do site (no Prisma Postgres, a string pooled). `DIRECT_URL` é a conexão direta, usada só pelas migrações, pelo Studio e pela CLI, e não vai para a Vercel. A CLI e o Prisma leem o `.env.local`. Para falar com outro banco, guarde as strings num arquivo com nome que o Next não carrega sozinho, como `.env.ranking-prod`, e aponte `ENV_FILE` para ele só na sessão. Assim a senha não fica no histórico do PowerShell:

```powershell
$env:ENV_FILE = ".env.ranking-prod"
npm run ranking -- list --remote
Remove-Item Env:ENV_FILE
```

### Banco local

Precisa do Docker Desktop aberto. As credenciais do `.env.example` valem só no Docker. Para criar o `.env.local` com elas e subir o banco:

```powershell
Get-Content .env.example | Select-String '^(DATABASE_URL|DIRECT_URL|TEST_DATABASE_URL)=' | ForEach-Object Line | Add-Content .env.local
npm run db:up
npm run db:migrate
```

| Comando                             | O que faz                                                                                      |
| ----------------------------------- | ---------------------------------------------------------------------------------------------- |
| `npm run db:up` / `npm run db:down` | Sobe e para o Postgres local. Os dados ficam num volume do Docker                              |
| `npm run db:migrate`                | Cria e aplica migrações, e só aceita o banco local                                             |
| `npm run db:deploy`                 | Aplica as migrações num banco remoto, com `ENV_FILE`                                           |
| `npm run db:studio`                 | Abre o Prisma Studio no banco configurado                                                      |
| `npm run test:integration`          | Roda os testes contra o Postgres de `TEST_DATABASE_URL`, que precisa ser um banco só de testes |

Com `RANKING_STORE=memory` no `.env.local`, o ranking fica na memória durante o desenvolvimento, sem Docker. Em produção essa variável é ignorada.

### API e defesas

| Rota                      | O que faz                                                                                                       |
| ------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `GET /api/ranking`        | Devolve os 10 melhores (posição, nome e tempo), com cache curto na CDN (`s-maxage=60`) e na memória do servidor |
| `POST /api/ranking/start` | Começa uma partida e devolve um token assinado com HMAC-SHA256, válido por 2 horas. Não toca no banco           |
| `POST /api/ranking`       | Recebe `{ token, name, timeMs }` e devolve o top 10 com a posição, ou `outside` quando o tempo não entra        |

Os envios só aceitam `Content-Type: application/json`, a origem do próprio site e corpo de até 1 KB. Tudo o que dá para conferir sem o banco é recusado antes dele: o formato, o nome (três letras de A a Z, fora de uma lista curta de combinações ofensivas), a assinatura e a validade do token, e o tempo, que precisa ficar entre 2:00 e 99:59.99 e não pode passar do tempo real desde o início da partida. Cada token vale um envio só, e cada IP pode enviar 5 resultados por hora. O IP vira um hash com o segredo antes de chegar ao banco. Banco fora do ar, pausado, sem cota ou lento vira `503` com `Retry-After`, sem detalhes internos. Sem `RANKING_SECRET`, o ranking fica desligado (`503 ranking_off`) e o jogo segue normal.

O IP vem do cabeçalho `x-real-ip`, que a Vercel reescreve com o endereço de verdade. Fora da Vercel, quem chama pode inventar esse valor, e o limite por IP deixa de valer.

O segredo precisa de pelo menos 32 bytes aleatórios, e cada ambiente tem o seu. Para gerar um:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

Em desenvolvimento, `RANKING_DEV_MIN_TIME_MS` (por exemplo `1000`) relaxa o tempo mínimo, para testar com as ferramentas de dev do jogo. Em produção essa variável é ignorada.

O tempo mínimo de 2:00, em `RANKING.minTimeMs` no `src/game/balance.ts`, fica abaixo da partida mais rápida possível. Só atravessar todas as fases sem parar já leva mais de um minuto e meio, e os três chefes e a escadaria levam a conta para perto de 2:30. Para recalibrar, a regra é usar no máximo 45% do melhor tempo conhecido, arredondado para baixo em passos de 15 segundos, e nunca passar desse piso. Com o melhor tempo do autor, 4:37.83, a regra dá 2:00. Assim o mínimo barra tempo impossível sem recusar quem joga muito bem.

### Limitações conhecidas

- É um easter egg, não um campeonato. Quem quiser trapacear com dedicação consegue mandar um tempo inventado dentro das regras. Para limpar o estrago existe a CLI
- O limite por IP depende da Vercel. Fora dela, quem chama pode inventar o `x-real-ip`
- O plano gratuito do Prisma Postgres não tem backup. O `export` da CLI é o backup
- Cada banco tem uma credencial com acesso total, sem um usuário só de leitura e escrita. A proteção vem do processo: o site nunca roda DDL, a migração não roda no build e cada ambiente tem o seu banco e o seu segredo

### Orçamento de operações

O plano gratuito do Prisma Postgres dá 200 mil operações por mês para o workspace inteiro, ou seja, preview e produção dividem a mesma cota. Contando cada comando SQL como uma operação, que é o pior caso:

| Rota                               | Operações por chamada                                                                                                                     |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/ranking`                 | 1, só quando os caches de 60 segundos vencem                                                                                              |
| `POST /api/ranking/start`          | 0                                                                                                                                         |
| `POST /api/ranking` válido         | Até 8 (limite por IP, início da transação, trava, token, top 10, inserção, corte e fim), mais 1 de limpeza a cada 10 minutos por servidor |
| Requisição recusada antes do banco | 0                                                                                                                                         |

| Cenário por mês                                     | Operações       | Parte da cota |
| --------------------------------------------------- | --------------- | ------------- |
| Uso real: 500 aberturas do jogo e 50 vitórias       | Menos de 1.000  | 0,5%          |
| Muito movimento: 10 mil aberturas e 1.000 vitórias  | Cerca de 18 mil | 9%            |
| Leitura sem parar o mês inteiro, em dois servidores | Até 86 mil      | 43%           |
| Um IP no limite de envios, sem parar, o mês inteiro | Cerca de 29 mil | 14%           |

Se a cota acabar, o banco para de responder até o mês seguinte. O ranking mostra uma mensagem suave e o jogo continua.

### Manutenção

`npm run ranking -- <comando>`:

| Comando                  | O que faz                                                                                     | Altera dados?    |
| ------------------------ | --------------------------------------------------------------------------------------------- | ---------------- |
| `list`                   | Posição, id, nome, tempo e data de cada entrada, mais o número de linhas de cada tabela       | Não              |
| `export [--out arquivo]` | Grava um JSON com as entradas                                                                 | Não              |
| `remove <id>`            | Remove uma entrada                                                                            | Só com `--apply` |
| `reset`                  | Apaga o ranking inteiro                                                                       | Só com `--apply` |
| `import <arquivo>`       | Restaura uma exportação. Recusa se o ranking não estiver vazio, a menos que venha `--replace` | Só com `--apply` |
| `purge`                  | Apaga tokens usados e contadores de IP já vencidos                                            | Só com `--apply` |

Sem `--apply`, os comandos só mostram o que fariam. Num banco remoto, todo comando também precisa de `--remote`, e a recusa acontece antes de qualquer conexão. A CLI sempre mostra o alvo com a senha mascarada, e `remove`, `reset` e `import --replace` gravam uma exportação em `ranking-backups/` antes de apagar.

Exemplos num banco remoto:

```powershell
$env:ENV_FILE = ".env.ranking-prod"
npm run ranking -- list --remote
npm run ranking -- export --remote
npm run ranking -- remove 12 --remote
npm run ranking -- remove 12 --remote --apply
Remove-Item Env:ENV_FILE
```

O Prisma Studio (`npm run db:studio`) abre o banco do arquivo de ambiente atual com permissão para editar tudo, sem exportar antes. Uso no local e no preview. Em produção, prefiro a CLI.

### Credenciais e segredo

- **Senha do banco:** no Prisma Console, abra o banco e gere uma nova connection string. A senha antiga continua valendo. Troque as strings no `.env.ranking-*` e o `DATABASE_URL` na Vercel, publique de novo, apague a credencial antiga no Console e confirme com `npm run ranking -- list --remote` que a nova funciona
- **`RANKING_SECRET`:** gere outro, troque na Vercel no escopo certo e publique de novo. As partidas em andamento ficam fora do ranking, porque o token delas deixa de valer, e os contadores por IP recomeçam. As entradas do ranking não mudam

Depois de mudar uma variável na Vercel, só os deploys novos a usam.

### Banco pausado ou sem cota

O jogo continua: o painel mostra "Não consegui carregar o ranking agora" e a vitória avisa que não deu para salvar. No Prisma Console, veja o uso do mês. Se a cota acabou, o banco volta no mês seguinte, ou antes, mudando de plano. Para trocar de banco, crie outro (qualquer Postgres gerenciado com string pooled e direta serve), rode `npm run db:deploy` nele, importe o último `export` com `npm run ranking -- import <arquivo> --remote --apply` e troque o `DATABASE_URL` na Vercel.

### Migrações

Depois de mudar o `prisma/schema.prisma`, crie a migração no banco local com `npm run db:migrate -- --name <nome>` e confira o SQL gerado em `prisma/migrations`. Nos bancos remotos, aplique com `npm run db:deploy` usando a conexão direta, nunca dentro do build da Vercel. As versões de `prisma`, `@prisma/client` e `@prisma/adapter-pg` andam juntas e ficam fixas.

### Atualizar o Prisma

As três dependências sobem juntas e sempre com versão exata, porque `npm install prisma` sem versão pode trazer uma candidata a lançamento:

```powershell
npm install --save-exact prisma@7.x.y @prisma/client@7.x.y @prisma/adapter-pg@7.x.y
npm run lint
npm run typecheck
npm run test
npm run test:integration
npm run build
```

O `postinstall` gera o cliente de novo. O Prisma 8 muda a CLI e a configuração. Quando ele deixar de ser candidata, a migração vira uma fase própria, seguindo o guia de atualização oficial. Até lá, o 7 continua recebendo correções.

## Publicação

- Antes de publicar, rodo `npm run lint`, `npm run typecheck`, `npm run test` e `npm run build`
- Na Vercel ficam as duas variáveis acima (Production) e o domínio `mgroschitz.dev`, com o `www` redirecionando para ele
- A v1 é outro projeto na Vercel, publicado com `basePath: '/v1'`, e o endereço `mgroschitz.vercel.app` dela não pode redirecionar para o domínio, senão o `/v1` volta para cá

### Ranking em preview e produção

1. No [Prisma Console](https://console.prisma.io), entre com o GitHub, crie um projeto e, dentro dele, dois bancos na região `us-east-1`: um para preview e outro para produção
2. Em cada banco, gere uma connection string e copie as duas versões: a pooled (`pooled.db.prisma.io`) e a direta (`db.prisma.io`)
3. Guarde cada par num arquivo que o Next não carrega e o git ignora, abrindo com `notepad .env.ranking-preview` e `notepad .env.ranking-prod`:

   ```text
   DATABASE_URL=<string pooled>
   DIRECT_URL=<string direta>
   ```

4. Aplique as migrações em cada banco e confira que ele está vazio:

   ```powershell
   $env:ENV_FILE = ".env.ranking-preview"
   npm run db:deploy
   npm run ranking -- list --remote
   Remove-Item Env:ENV_FILE
   ```

   Depois, o mesmo com `.env.ranking-prod`

5. Gere dois segredos diferentes, um para cada ambiente, com o comando da seção "API e defesas"
6. Na Vercel, em Settings → Environment Variables, crie como Secret o `DATABASE_URL` (string pooled) e o `RANKING_SECRET` do preview só no escopo Preview, e os dois de produção só no escopo Production. `DIRECT_URL`, `RANKING_STORE` e `RANKING_DEV_MIN_TIME_MS` não vão para a Vercel
7. Publique uma branch para gerar um preview, jogue uma partida até o fim e confira com a CLI que a linha foi para o banco de preview e que o de produção continua vazio. Apague a linha de teste com `remove <id> --remote --apply`
8. Faça o merge para publicar em produção e abra `https://mgroschitz.dev/api/ranking`, que deve devolver `{"entries":[]}`

Sem `RANKING_SECRET` ou sem `DATABASE_URL`, o ranking some com uma mensagem suave e o jogo funciona normalmente. O build não precisa de nenhuma das duas.

## Contato

- LinkedIn: [linkedin.com/in/mikhael-groschitz](https://www.linkedin.com/in/mikhael-groschitz/)
- Email: [mgroschitz@gmail.com](mailto:mgroschitz@gmail.com)

## Licença

MIT
