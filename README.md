# Portifolio-v2

A segunda versão do meu portfólio, agora com cara de SQL Server Management Studio.

Sou engenheiro de dados e trabalho com SQL Server e T-SQL, então resolvi apresentar a minha trajetória do jeito que conheço melhor: como um banco de dados. Cada seção do site é uma tabela. Um clique no Object Explorer abre o script e o resultado aparece na grade, como numa consulta de verdade, só que nenhum SQL é executado de fato.

A versão atual continua no ar em [mgroschitz.dev](https://mgroschitz.dev) enquanto esta é construída.

## Status

Em construção. Na primeira visita de cada sessão aparece a tela Conectar ao Servidor. Um clique em Conectar (ou um Enter) abre a janela do SSMS vazia, como o programa de verdade: o Object Explorer já mostra as tabelas e a barra amarela avisa que a conexão deu certo. A partir daí, a Nova Consulta abre uma aba em branco (SQLQuery1.sql, SQLQuery2.sql...) com destaque de sintaxe, autocomplete e o comando `HELP`, e cada tabela do Object Explorer abre o próprio script T-SQL numa aba e executa na hora. A grade mostra os dados (cada consulta numa grade própria, com divisória entre elas), a aba de mensagens mostra, para cada consulta, as linhas afetadas, o tempo de execução e o horário de conclusão, e a barra amarela acompanha o resultado. Os menus e as duas barras de ferramentas seguem o SSMS, e os painéis mudam de tamanho, se ocultam e podem flutuar. Cada seção tem o seu endereço (`/about`, `/tech-stack`, `/career`, `/projects`, `/beyond-the-terminal`, `/contact` e `/resume`), que já abre com a tabela executada, e a versão em inglês fica sob `/en` (`/en/career`, por exemplo). A procedure `sp_DownloadCV` entrega o currículo em PDF. Para quem não conhece SQL, a Colinha começa pela Nova Consulta, lista as seções com um clique e traz exemplos prontos, e um tour de três passos mostra onde clicar. Também existe a paleta de cores (`/palette`), só em português. Cada página tem título, descrição e imagem de compartilhamento próprios nos dois idiomas, e o site tem `sitemap.xml` e `robots.txt`. Dá para navegar só pelo teclado ou com leitor de tela, e no celular a grade vira cartões.

## Stack

- Next.js 16 (App Router) com TypeScript em modo strict, gerando páginas estáticas
- CSS Modules
- Shiki para o destaque de sintaxe do T-SQL, no build e no navegador
- Vitest, ESLint e Prettier

## Rodando localmente

Precisa do Node.js 20.9 ou mais novo.

```powershell
npm install
npm run dev
```

O site abre em `http://localhost:3000`. Para testar no celular, ligue-o na mesma rede e abra o endereço que o `npm run dev` mostra em Network (algo como `http://192.168.1.7:3000`). O Next bloqueia, por padrão, outros endereços no servidor de desenvolvimento, e sem isso a página carrega mas não responde aos toques; por isso o `next.config.ts` libera os IPs da própria máquina.

Um dos segredos do site leva à versão anterior do portfólio. O endereço dela vem da variável `NEXT_PUBLIC_V1_URL`: copie o `.env.example` para `.env.local` e preencha. Sem a variável, o segredo responde com uma mensagem amigável e ninguém sai da página. Como toda variável `NEXT_PUBLIC_`, ela entra no build, então depois de mudar é preciso reiniciar o `npm run dev` ou gerar o build de novo.

| Comando             | O que faz                          |
| ------------------- | ---------------------------------- |
| `npm run dev`       | ambiente de desenvolvimento        |
| `npm run build`     | build de produção                  |
| `npm run start`     | serve o build de produção          |
| `npm run lint`      | ESLint e verificação de formatação |
| `npm run format`    | formata o código com o Prettier    |
| `npm run typecheck` | checagem de tipos                  |
| `npm run test`      | testes                             |

## Arquitetura

O código é dividido em camadas. O `content` e o `theme` não dependem de nada, o `engine` só lê o `content`, os `components` usam os três e o `app` monta as rotas em cima disso. O `game` fica à parte: a interface conhece só o título dele e o abre sob demanda, e ele usa da interface apenas o idioma, a preferência de movimento e os ícones.

```text
src/
  content/      todos os textos e dados do site, em português e inglês
  theme/        tokens de cor (a única fonte de cores) e tema do destaque de sintaxe
  engine/       motor das consultas: catálogo, execução, erros e segredos, sem React e sem DOM
  components/   interface em React, uma pasta por parte da janela
  app/          rotas do Next.js e metadados
  game/         um segredo, baixado só quando alguém o abre
```

Em `components`, o `shell` monta a janela, o layout e o rodapé; `commands` é a camada de comandos que alimenta menus, barras e o Pesquisar; `menu` e `toolbar` têm o item de menu, o botão de comando e a barra reaproveitados por todo lado; e `editor`, `results`, `explorer`, `connect`, `cheatsheet`, `locale`, `preferences` e `easter-eggs` cuidam do que o nome diz. Na raiz ficam os ícones e dois utilitários usados em várias partes: navegação por setas e clique fora (`interaction.ts`) e leitura e gravação no `sessionStorage` e no `localStorage` (`browser-storage.ts`).

Os testes ficam ao lado do código: um arquivo por módulo nas pastas grandes (`shell`, `engine` e o núcleo do jogo) e um por pasta nas pequenas.

### Como adicionar uma seção

1. Acrescente o id em `SECTION_IDS` e o tipo das linhas em `Tables`, os dois em `src/content/types.ts`.
2. Rode `npm run typecheck`. O compilador aponta cada lugar que precisa da seção nova: os dados e os textos nos dois idiomas em `src/content/globals.ts` (nome, descrição, comentários do script e metadados) e a leitura das linhas em `src/content/index.ts`.
3. Descreva a tabela, ou a procedure, no catálogo (`src/engine/catalog.ts`). O script, a árvore do Object Explorer e o autocomplete saem dele.
4. Crie a rota `src/app/[lang]/(shell)/<id>/page.tsx`, igual às das outras seções, com o `pageMetadata` e o `SectionDocument`. Ela já nasce nos dois idiomas, na raiz e sob `/en`.
5. Alguns testes listam as seções de propósito, como os de endereços e do sitemap. Acrescente a nova neles.

### Como adicionar um item de menu

1. Acrescente o id ao tipo `CommandId` (`src/content/types.ts`) e o rótulo nos dois idiomas em `shell.commands` (`src/content/globals.ts`).
2. Em `src/components/commands/command-model.ts`, diga em `COMMANDS` do que o comando precisa (`requires`, como `connected` ou `document`) e o atalho, se tiver. Depois ponha o id no menu certo, em `MENUS`.
3. Ligue a ação em `actions`, no `src/components/commands/command-context.tsx`. Se o item existe só para lembrar o SSMS, marque `illustrative: true` e ele responde com o aviso simpático.
4. O Pesquisar passa a encontrar o comando sozinho (menos os de aviso simpático), e para pô-lo numa barra basta um `CommandButton` com o id. A matriz de estados em `command-model.test.ts` diz quando ele fica ativo.

### Como adicionar um inimigo

1. Dê um nome ao tipo em `EnemyKind` (`src/game/entities/enemy.ts`), com tamanho e vida, e ponha os números em `src/game/balance.ts`.
2. Escreva o comportamento num arquivo próprio em `src/game/entities`, como uma função pura que recebe o inimigo e o mundo, com testes. Chame essa função em `moveEnemies` (`src/game/core/world.ts`) e acerte o dano e a reação ao golpe em `src/game/core/combat.ts`.
3. Escolha uma letra em `MARKERS` (`src/game/levels/level.ts`), crie o inimigo a partir dela em `createEnemies` e coloque a letra num dos mapas de `src/game/levels/rooms.ts`.
4. Desenhe o sprite em `src/game/render/enemy-art.ts`, com as cores de `src/game/palette.ts`, registre-o em `art.ts` e desenhe-o em `entities.ts`. Os testes conferem os sprites e que nada pisca mais de três vezes por segundo.

## Decisões de projeto

- Todas as cores vêm de `src/theme/tokens.css`. Os componentes usam as variáveis CSS e o tema do Shiki aponta para as mesmas variáveis, então mudar uma cor é mexer em um lugar só. Um teste garante que todos os tokens existem e que os pares de texto e fundo passam no contraste AA da WCAG.
- Estilos com CSS Modules; o CSS global fica só em `src/app/globals.css`.
- Fontes do sistema, sem nenhuma fonte embutida.
- Todos os textos do site ficam em `src/content/globals.ts`, um bloco por idioma. Um teste garante que os dois idiomas têm a mesma estrutura e que nomes, datas, links e tecnologias batem entre eles. A mesma fonte alimenta os scripts, a grade de resultados, a Colinha e os metadados.
- O site existe em português e inglês, cada idioma no seu endereço: o português fica na raiz (`/career`) e o inglês sob `/en` (`/en/career`). Na primeira visita, o servidor olha o idioma do navegador e leva quem não usa português para a versão em inglês. Trocar o idioma, pelo botão do canto, por Ferramentas > Opções ou com `Language=` no diálogo de conexão, abre a mesma página no outro endereço e guarda a escolha num cookie, que passa a valer daí em diante. A página recarrega: a conexão, o layout e a aba atual continuam, mas as outras abas e o texto da Nova Consulta ficam para trás. Robôs de busca e de pré-visualização de links nunca são redirecionados. Quem decide é o `src/proxy.ts`, com as regras, puras e testadas, em `src/components/locale/locale-routing.ts`.
- Cada endereço sai do servidor num idioma só: o `lang` do `<html>`, o título, a descrição, a imagem de compartilhamento e todo o conteúdo, mesmo sem JavaScript. O jogo, a Colinha, o tour, as mensagens de erro e os avisos seguem o idioma do endereço.
- A interface do SSMS acompanha o idioma: em português aparecem Arquivo, Pesquisador de Objetos e Pronto; em inglês, File, Object Explorer e Ready.
- Os menus do SSMS (Arquivo, Editar, Exibir, Git, Ferramentas, Extensões, Janela e Ajuda, mais o Consulta, que só aparece com uma aba aberta, como no programa) saem de uma camada de comandos só (`src/components/commands/command-model.ts`). Cada comando diz do que precisa (conexão, uma aba aberta, uma consulta editável, histórico para desfazer) e a mesma regra liga e desliga o item no menu, no Pesquisar e nas barras. Uma matriz de estados testada garante que, desconectado, só Conectar, Nova Consulta e os comandos da própria janela ficam ativos.
- Quase tudo funciona de verdade: Salvar (Ctrl+S, de qualquer ponto da janela, sempre que houver uma aba aberta) baixa a aba ativa como `.sql`, Fechar e Fechar Todos os Documentos fecham abas, Editar desfaz, refaz, recorta, copia, cola e seleciona tudo no editor, Exibir mostra e oculta o Pesquisador de Objetos, os resultados e a Colinha, e põe a janela em tela inteira (Shift+Alt+Enter). Os poucos itens que existem só para lembrar o SSMS, como Clonar Repositório, respondem com um aviso curto e simpático, um de cada vez, anunciado para leitores de tela, em vez de ficarem mudos.
- O editor de consultas tem histórico próprio de desfazer e refazer (Ctrl+Z e Ctrl+Y), que junta as letras digitadas em sequência num passo só, e uma barra Localizar (Ctrl+F, F3 e Shift+F3) que marca todas as ocorrências e anda entre elas. Fora do editor, o Ctrl+F continua sendo a busca do navegador.
- O Pesquisar do alto da janela (Ctrl+Q) acha seções, comandos e exemplos, sem ligar para acentos, e executa o que for escolhido. No Linux o atalho não aparece, porque o Firefox usa Ctrl+Q para fechar.
- No canto direito ficam o idioma, o Entrar (que vira o perfil conectado, com Trocar perfil e Desconectar), o balão de contato, com a lista de canais no ▾, e o Compartilhar, que copia o link da página. O rodapé mostra o estado (Pronto, Conectando, Executando ou o resultado da consulta), abre o repositório deste site e guarda algumas dicas no sino.
- Ferramentas > Opções troca o idioma, o tamanho da fonte do editor (o mesmo zoom da barra do editor) e pode reduzir as animações. O tamanho da fonte e as animações ficam no `localStorage`, e um script no `<head>` os aplica antes da primeira pintura. Ajuda > Sobre mostra a versão e os créditos.
- As duas barras de ferramentas do SSMS, Padrão e Editor SQL, usam ícones desenhados para o site e os mesmos comandos dos menus. Funcionam de verdade: navegar para trás e para a frente entre as abas visitadas (o ▾ lista as últimas), Salvar, Nova Consulta, Desfazer e Refazer (o ▾ lista as ações, para voltar vários passos de uma vez), Conectar e Desconectar, Executar, Parar, Analisar (confere a sintaxe com o motor sem executar nada, nem os segredos), Resultados em Grade ou em Texto, Comentar e Remover comentário (também com Ctrl+K, Ctrl+C e Ctrl+K, Ctrl+U no editor) e os dois recuos. Os demais botões, como os planos de execução, respondem com o aviso simpático.
- Cada barra é uma `role="toolbar"` com uma única parada do Tab; dentro dela, as setas, Home e End andam entre os botões ativos. O que não cabe na largura vai para o menu "…" no fim da barra, que também existe na barra do Object Explorer. No celular, sobram só o Object Explorer, a Nova Consulta e o Executar; o resto, Contato e Compartilhar inclusive, fica no "…".
- Os controles mostram uma dica com o nome e o atalho ao passar o mouse e também com o foco do teclado.
- No celular, o Object Explorer vira uma gaveta lateral e os menus menos usados se recolhem em um botão; a Ajuda continua à vista.
- O Object Explorer, a Colinha e o painel de resultados se comportam como no SSMS. As divisórias mudam o tamanho com o mouse ou com as setas; Enter recolhe e restaura, e um duplo clique volta ao tamanho padrão. O Object Explorer fecha no X e volta pelo menu Exibir ou pelo F8. Com o alfinete, ele se oculta numa aba na borda esquerda, que desliza ao passar o mouse ou ao clicar e se recolhe quando o foco sai. Arrastando a alça pontilhada, ele vira uma janela flutuante, que se move pelas setas e muda de tamanho com Shift e as setas; um duplo clique na alça o encaixa de novo. A Colinha tem os mesmos controles, com a aba na borda direita e o X fechando de vez (ela volta pelo menu Ajuda). Quando a janela estreita, o título encurta com reticências e os ícones que não cabem saem da barra. Os resultados recolhem até sobrar só as abas, ou maximizam por cima do script. Com mais de uma consulta, cada grade ganha o seu painel com rolagem própria e uma divisória entre eles, que também responde ao teclado.
- O layout, que inclui a escolha entre grade e texto nos resultados, fica no `sessionStorage` e é aplicado por um script no `<head>` antes da primeira pintura, como a conexão, então recarregar não faz nada pular. Janela > Redefinir Layout da Janela volta tudo ao padrão, a Colinha inclusive. A lógica do layout (limites, recolher, ocultar, flutuar e redefinir) é pura e testada (`src/components/shell/layout-model.ts`). No celular, as divisórias somem, o Object Explorer continua gaveta e os resultados continuam empilhados.
- O estado da interface usa só recursos do React (Context e `useReducer`), sem biblioteca extra.
- A URL manda na aba ativa: abrir uma tabela muda o endereço, e voltar, avançar ou recarregar a página leva sempre à aba certa. As abas abertas não se repetem e todas podem ser fechadas; fechando a última, a janela volta a ficar vazia na página inicial do idioma (`/` ou `/en`). As consultas novas dividem o endereço `/query`, e recarregar nele abre uma SQLQuery1.sql em branco.
- A execução é simulada por um motor em TypeScript puro (`src/engine/execute.ts`), sem React e sem DOM. Não há parser de SQL: o motor separa o texto em comandos (por `;`, `GO` ou pelo começo de cada comando), ignora maiúsculas, espaços, comentários e colchetes, e procura cada comando num dicionário montado a partir do catálogo. Cada comando reconhecido devolve uma grade; o primeiro desconhecido devolve um erro no formato do SQL Server, com a linha em que está e uma dica de comando válido. A página de cada seção já sai do servidor com a grade preenchida, então o conteúdo está no HTML mesmo sem JavaScript.
- Os erros vêm de um pool de mensagens com referências a Doctor Who, Super Mario, Portal, Metal Gear Solid e Dark Souls (`src/engine/errors.ts`), em português e em inglês.
- Os segredos ficam num registro à parte (`src/engine/easter-eggs.ts`), consultado só quando o comando não é um dos conhecidos. Nenhum deles aparece no Pesquisador de Objetos, no HELP, na Colinha ou no autocomplete. O motor só descreve o efeito, e a interface cuida da animação e da navegação, sempre respeitando a preferência por menos movimento.
- A data de lançamento desta versão, usada por um dos segredos, fica em `V2_LAUNCH_DATE`, no mesmo arquivo. Por enquanto é provisória e muda para a data do deploy.
- A TARDIS da barra amarela é o mesmo ícone de sempre, agora girando: uma volta a cada sete segundos, mais rápido com o mouse ou o foco em cima, e a lâmpada pulsando devagar. Na viagem entra uma TARDIS maior, uma caixa 3D feita só com CSS e quatro faces em SVG desenhadas para o site (`src/components/easter-eggs/tardis.tsx`): ela gira cada vez mais rápido enquanto some aos poucos e, na volta, reaparece girando até parar. Tudo é `transform` e `opacity` em CSS, sem laço em JavaScript, e um teste confere que nada pisca mais de três vezes por segundo. Com menos movimento, as duas ficam paradas, de frente.
- O mini jogo, Symphony of the Database, fica em `src/game`, em TypeScript puro com canvas 2D. As pastas separam o que é lógica pura, testada sem navegador (`core`, `entities` e `levels`, com os mapas escritos em strings), do que desenha e conversa com a página (`render` e `ui`). Sprites, cenário, letreiro e fonte de pixel são arrays de strings desenhados em código, sem arquivos de imagem. Os números de dificuldade ficam todos em `src/game/balance.ts`. Projéteis, partículas e itens usam conjuntos fixos de objetos reaproveitados, então o jogo não cria objetos a cada quadro. O código só é baixado quando alguém abre o jogo e, ao sair, ele desliga o laço e os atalhos de teclado. Em aparelhos só de toque, uma mensagem explica que ele foi feito para teclado.
- A fase tem quatro salas ligadas por portas (`src/game/levels/stage.ts`): a entrada, montada juntando o Hall dos Racks e o Corredor dos Logs lado a lado, a sala do Garbage Collector, a escada e a sala do trono do Legacy System. Cada sala é um mapa próprio, e os mapas ficam juntos em `src/game/levels/rooms.ts`; a porta de uma sala com chefe só abre depois da luta, e um Crash recomeça da entrada da sala, com o chefe de volta ao início. Um teste percorre a entrada andando e pulando até a porta, e outro procura, com a física de verdade do personagem, um caminho de porta a porta na escada.
- Os dois chefes são máquinas de estado puras (`entities/collector.ts` e `entities/legacy.ts`), testadas passo a passo e também em lutas inteiras simuladas, para garantir que nenhuma delas trava. O Legacy System faz `ROLLBACK` na primeira derrota e `COMMIT` na segunda.
- Em desenvolvimento (`npm run dev`), a tecla `=` sobe a RAM e `Page Down` leva o Admin até a próxima porta ou derruba o chefe da sala, para testar cada luta sem jogar tudo de novo. Os dois atalhos não existem no build de produção.
- A música e os efeitos são sintetizados com a Web Audio API, sem arquivos de áudio (`src/game/audio`). O órgão soma harmônicos como os registros de um órgão de verdade (flauta, principal, pleno, palheta e pedal), com ataque lento, vibrato leve e um reverb de catedral gerado em código. As faixas ficam em `src/game/audio/music` como dados, com notas e durações, e um sequenciador agenda cada nota com um pouco de antecedência. Testes conferem que as partes de cada faixa fecham juntas em compassos inteiros, ficam em ré menor e cabem na extensão de cada registro.
- O som só começa no Enter da tela de título, que cria o `AudioContext`. `M` liga e desliga o som, e a escolha vale até o fim da sessão. Pausar, esconder a aba ou sair silenciam o jogo, e sair fecha o contexto de áudio.
- Para trocar o órgão por gravações, basta escrever outro `MusicPlayer` (a interface está em `src/game/audio/organ-player.ts`) que toque um arquivo para cada nome de faixa e entregá-lo ao `createGameAudio`.
- O jogo abre como diálogo modal: o foco fica nos botões do próprio jogo (Tab e Shift+Tab dão a volta neles) e volta ao elemento de origem ao sair. Uma região `aria-live` anuncia a abertura, os avisos, a pausa, o Crash e a vitória, e os medidores de RAM e dos chefes têm nome e valor. Nada pisca mais de três vezes por segundo, e os testes conferem isso para as luzes do cenário, o Admin, os inimigos e o brilho de dano dos chefes. Com a preferência por menos movimento, somem o tremor, o parallax, as luzes piscando e as animações que só enfeitam.
- O jogo tem duas exceções combinadas às regras acima. As cores do canvas vivem numa paleta própria (`src/game/palette.ts`), enquanto o HUD e os painéis em HTML continuam nos tokens. Os textos do jogo ficam em `src/game/ui/texts.ts`, nos dois idiomas, para só serem baixados com ele. Testes garantem que as cores de sintaxe da paleta batem com os tokens e que as mensagens de erro do jogo usam a mesma tradução da aba Mensagens.
- Um teste varre o `src/` e garante que o nome da série homenageada pelo jogo e os dos seus personagens não aparecem em lugar nenhum. A palavra do código secreto só aparece nos arquivos que cuidam dele.
- F5 ou Alt+X executam com o foco no editor, como no SSMS; fora dele, o F5 continua recarregando a página. O botão Executar roda o script da aba ativa e fica desabilitado sem aba aberta ou sem conexão, como na barra do SSMS.
- A Nova Consulta abre pelo botão da barra de ferramentas, pelo menu Arquivo, pela Colinha ou com Alt+N. O Ctrl+N fica de fora porque o Chrome, o Edge e o Firefox o reservam para abrir uma janela e não o entregam à página. Cada clique abre uma consulta nova e numerada, como no SSMS. O editor é um campo de texto comum com o T-SQL colorido por cima, nas mesmas cores dos scripts, e um autocomplete próprio que sugere palavras-chave, tabelas e procedures conforme o contexto. Funciona com teclado, leitor de tela e celular. Com um trecho selecionado, F5 executa só a seleção, como no SSMS. Alt+F1 roda o `sp_help` do nome selecionado e mostra a estrutura da tabela em várias grades (colunas, tipos, chave primária), e sem seleção lista os objetos do banco, como o atalho do SSMS.
- A tela de conexão aparece uma vez por sessão. Um script no `<head>` lê o `sessionStorage` antes da primeira pintura e marca o `<html>` como pendente, conectado ou desconectado; o CSS só mostra o diálogo para quem ainda não decidiu. Quem recarrega a página não vê o diálogo piscar, e sem JavaScript o conteúdo aparece direto, sem diálogo.
- O diálogo é um overlay: o conteúdo continua no HTML e à vista, só escurecido atrás dele, e o resto da janela fica inerte enquanto ele está aberto. Cancelar, Esc ou o X fecham o diálogo sem conectar, como no SSMS: o Object Explorer fica vazio, o rodapé mostra Pronto e o diálogo não volta sozinho. O Conectar do Object Explorer e do menu Arquivo, a Nova Consulta e qualquer ação que precise de conexão abrem o diálogo de novo, e a ação continua depois de conectar.
- Os dois perfis de autenticação, visitante e dev, mostram o mesmo conteúdo. O perfil escolhido vira o login da barra amarela e do servidor no Object Explorer. Quem entra como visitante ganha o tour e a Colinha aberta; quem entra como dev começa sem tour e com a Colinha na aba lateral.
- A Colinha, inspirada no Template Explorer do SSMS, fica à direita em telas largas e vira um painel que sobe de baixo nas menores. Ela começa pela Nova Consulta; as seções são links de verdade, então funcionam até sem JavaScript, e os exemplos vão para a consulta aberta ou abrem uma nova. Encaixada, na aba lateral, flutuante ou fechada, ela lembra a escolha durante a sessão, aplicada pelo mesmo script do `<head>` que cuida do layout, sem piscar.
- O tour tem três passos e aparece uma vez por sessão, logo depois de conectar como visitante: a Nova Consulta, as tabelas do Object Explorer e a Colinha. Os dois primeiros avançam sozinhos quando a pessoa faz o que o passo sugere; Pular ou Esc fecham, e o menu Ajuda reinicia. Até a primeira aba aberta, o botão Nova Consulta pulsa de leve (ou fica só destacado, para quem prefere menos movimento).
- Em Opções, "Usar cor personalizada" muda de verdade a cor da barra de conexão durante a sessão, com o texto em preto ou branco conforme o contraste. `Language=en` nos parâmetros adicionais troca o idioma do site ao conectar, abrindo a mesma página na versão em inglês.
- Os metadados gerais ficam no layout de cada idioma (`src/app/[lang]/layout.tsx`): título com modelo (`%s | nome`), descrição, palavras-chave, autor, Open Graph e cartão do Twitter. Cada página completa com o próprio título, descrição e endereço canônico, montados em `src/app/site-metadata.ts` a partir dos mesmos textos do site. A página inicial é a janela vazia, com o nome e o cargo à vista, e cada seção tem o próprio endereço canônico em cada idioma. Cada página aponta para a gêmea no outro idioma com `hreflang`, e o português responde como `x-default`. O sitemap lista as duas versões das páginas que devem aparecer na busca; a Nova Consulta e a paleta ficam de fora.
- Não existe uma versão paralela para buscadores. Cada endereço de seção sai do servidor com o script e a grade preenchidos, e esse conteúdo fica visível, só escurecido, atrás do diálogo de conexão. As tabelas do Object Explorer são links de verdade, então dá para navegar sem JavaScript; nesse caso, um aviso explica que a janela fica só para leitura.
- Os metadados saem no idioma do endereço, com o `og:locale` de cada um e o outro idioma como alternativo.
- A imagem de compartilhamento é gerada no build com o `ImageResponse` do próprio Next.js, uma por idioma. Ela imita a janela do site e usa as cores do `tokens.css`.
- Um endereço que não existe mostra um 404 no tema do site e no idioma do endereço: o erro 404 do pool, o da tabela que está em outro castelo, e um link de volta para o início. Com o Cache Components do Next.js 16, essa página é montada no navegador a partir dos dados que vêm na resposta, então sem JavaScript ela fica em branco; o status 404 e o `noindex` saem do servidor de qualquer forma.
- Cada aba tem um `h1`, visível só para leitores de tela; na janela vazia, o título com o nome e o cargo aparece para todo mundo. As regiões têm títulos: Pesquisador de Objetos, Resultado da consulta e Colinha. O primeiro Tab mostra o link "Pular para o conteúdo". Depois de executar, a barra amarela anuncia o resultado com o número de linhas.
- No celular, cada linha da grade vira um cartão, com o nome da coluna ao lado do valor e os textos longos logo abaixo. Para leitores de tela, continua sendo uma tabela.
- Animações e transições respeitam a preferência por menos movimento, a do sistema ou a escolhida em Opções. As duas viram um único atributo no `<html>`, que o CSS, a viagem no tempo e o jogo consultam.
- Os scripts são montados a partir do catálogo de objetos (`src/engine/catalog.ts`), o mesmo que alimenta a árvore, e coloridos pelo Shiki com o motor de expressões regulares em JavaScript, sem WASM. Por cima do Shiki há um ajuste: nomes de coluna como `Role` e `Description` voltam à cor de identificador, e `AND`, `OR`, `LIKE` e a pontuação ficam cinza, como no SSMS.
- Nada do que o visitante digita é executado como código.
- Ícones próprios em SVG, sem marcas da Microsoft.
- Commits seguem o padrão Conventional Commits.

## Roadmap

- [x] Base do projeto e paleta de cores
- [x] Conteúdo
- [x] Janela do SSMS
- [x] Scripts das seções e Object Explorer
- [x] Execução das consultas
- [x] Tela de conexão
- [x] Nova consulta com autocomplete
- [x] Guia para quem não conhece SQL
- [x] SEO e acessibilidade
- [x] Versionamento e viagem no tempo
- [x] Mini jogo
- [x] Janela completa do SSMS: menus, barras, painéis dinâmicos e TARDIS animada
- [ ] Publicação

## Licença

MIT
