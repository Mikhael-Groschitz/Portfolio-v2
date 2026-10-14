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

## Publicação

- Antes de publicar, rodo `npm run lint`, `npm run typecheck`, `npm run test` e `npm run build`
- Na Vercel ficam as duas variáveis acima (Production) e o domínio `mgroschitz.dev`, com o `www` redirecionando para ele
- A v1 é outro projeto na Vercel, publicado com `basePath: '/v1'`, e o endereço `mgroschitz.vercel.app` dela não pode redirecionar para o domínio, senão o `/v1` volta para cá

## Contato

- LinkedIn: [linkedin.com/in/mikhael-groschitz](https://www.linkedin.com/in/mikhael-groschitz/)
- Email: [mgroschitz@gmail.com](mailto:mgroschitz@gmail.com)

## Licença

MIT
