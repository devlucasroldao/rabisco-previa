# Rabisco Prévia

Ferramenta interna da agência Rabisco pra apresentar o conteúdo da semana aos clientes por link, com cara de perfil do Instagram.

Hoje o conteúdo vai pro cliente numa pasta zipada pelo WhatsApp: ele não vê como o post fica no feed, a legenda chega separada da arte e o feedback não diz de qual post está falando. Com a Prévia, o cliente abre um link no celular, vê o grid dos próximos posts numerados e toca em cada um pra ver a arte, o carrossel, o Reels e a legenda. O ajuste continua pelo WhatsApp, citando o número do post.

<p>
  <img src="docs/screenshots/grid.png" alt="Perfil com o grid dos próximos posts numerados" width="260">
  <img src="docs/screenshots/post.png" alt="Visualizador de um carrossel com a legenda" width="260">
  <img src="docs/screenshots/reels.png" alt="Visualizador de um Reels" width="260">
</p>

A especificação completa está em [docs/SPEC.md](docs/SPEC.md).

## Estado atual

**Redesenho do painel com a identidade da Rabisco**, depois da Etapa 6 (gestão da apresentação: reordenar posts arrastando, desativar, reativar e regenerar o link, e trocar a senha). Antes vieram os stories (5), o medidor de armazenamento e a limpeza das semanas antigas (4B) e a compressão de vídeo no navegador (4A). Ficam pra depois: upload em massa e agrupar arquivos em carrossel.

- `/admin`: painel da equipe, com login por e-mail e senha. Cadastra clientes, monta as apresentações e adiciona os posts (post, carrossel ou Reels)
- `/p/<token>`: apresentação lida do Supabase, com a mídia num bucket privado servida por URL assinada (validade de 6 horas)
- `/p/demo` e `/p/single`: modo demo, com dados locais, que funciona sem configurar nada
- qualquer outro token: "Esta prévia não existe ou foi removida"

O post aberto fica na URL (`/p/demo?post=2`), então o voltar do navegador fecha o visualizador e o link de um post pode ser compartilhado.

## Como rodar (modo demo)

Precisa de Node 20.12+ e [pnpm](https://pnpm.io). É o jeito rápido de testar: não usa banco nem variáveis de ambiente.

```bash
pnpm install
pnpm dev
```

Abra <http://localhost:3000/p/demo>. Pra ver como o cliente vê, use o modo de dispositivo do DevTools em 390×844.

Outros comandos: `pnpm build`, `pnpm start` e `pnpm lint`.

## Rodando com Supabase

1. Crie um projeto no [Supabase](https://supabase.com) e crie um `.env.local` na raiz com as variáveis abaixo, preenchidas com os dados do projeto (Project Settings > API):

   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

   A `service_role` ignora o RLS: fica só no servidor, nunca com o prefixo `NEXT_PUBLIC_`. O `.env.local` não vai pro repositório.

   Os valores entram sem aspas, e a URL começa com `https://` e não termina com `/`. O app tira os espaços das pontas e recusa o resto com um erro que cita a variável (sem mostrar o valor). `pnpm check:auth` confere se o Supabase aceita a URL e a chave pública do `.env.local`: imprime só o status HTTP e `OK` ou `FALHOU`.
2. Aplique as migrations no projeto remoto (não precisa de Docker):

   ```bash
   pnpm dlx supabase login
   pnpm dlx supabase link --project-ref <ref-do-projeto>
   pnpm dlx supabase db push
   ```

3. Crie a apresentação de exemplo. O script envia os arquivos de `public/sample/` pro bucket e imprime o link:

   ```bash
   pnpm seed
   ```

4. Rode `pnpm dev` e abra o link impresso (`http://localhost:3000/p/<token>`).

Rodar `pnpm seed` de novo cria outra apresentação e reaproveita o cliente.

### Painel

O painel fica em <http://localhost:3000/admin> e não tem cadastro nem "esqueci a senha": crie os usuários da equipe no Supabase, em Authentication > Users > Add user, com e-mail, senha e "Auto Confirm User". Cada pessoa troca a própria senha em Conta (veja abaixo); senha esquecida se resolve pelo dashboard.

A barra lateral lista os clientes (com filtro a partir de 9), tem "Novo cliente", o medidor de armazenamento e o menu da conta (tema Claro/Escuro/Sistema, trocar senha e sair). No celular ela vira gaveta, aberta pelo botão do topo.

- **Início** (`/admin`): clientes e apresentações mais recentes e o atalho pro armazenamento.
- **Cliente** (`/admin/clientes/<id>`): avatar, nome, @ e bio; "Editar cliente" abre um painel lateral (nome, @, bio e foto, recortada em 320×320 no navegador). Excluir fica no "⋯" e pede o @ digitado. Cada apresentação aparece com posts, peso, idade, o selo "Antiga" e o estado do link; o "⋯" da linha abre, copia o link, mostra como cliente, desativa/reativa e exclui.
- **Apresentação** (`/admin/apresentacoes/<id>`): título com lápis pra renomear, "Copiar link" (ação principal), "Ver como cliente" e o "⋯" com desativar/reativar e regenerar. Novo post e editar post abrem num painel lateral: tipo (Post, Carrossel, Reels), arquivos por arrastar e soltar ou clique, prévia com nome e peso, barra de progresso real e a ordem das imagens do carrossel. A legenda aceita até 2200 caracteres.
- **Armazenamento** (`/admin/armazenamento`): o uso do bucket e a limpeza das apresentações antigas (veja abaixo).

Tudo que apaga ou troca o link pede confirmação num dialog que explica a consequência; o resultado aparece num aviso no canto (toast).

As imagens são redimensionadas no navegador pra até 1080 px de largura, em JPEG. O vídeo é comprimido no navegador (veja abaixo) e o arquivo final tem que caber em 50 MB, que é o limite por arquivo do plano gratuito do Supabase.

Os arquivos vão direto do navegador pro bucket, com a sessão de quem entrou, e nunca passam pelas funções do Next (a Vercel limita o corpo da requisição a cerca de 4,5 MB). O post só é gravado depois que todos os envios terminam, e o servidor confere no bucket o tipo e o tamanho de cada arquivo antes de gravar.

Excluir um post, uma apresentação ou um cliente apaga primeiro os arquivos do bucket e depois a linha no banco. Excluir ou reordenar posts muda os números na tela do cliente: se o link já foi enviado, avise o cliente ou crie outra apresentação.

### Gestão da apresentação

Dentro de `/admin/apresentacoes/<id>`:

- **Reordenar posts:** arraste pela alça (⋮⋮) à esquerda de cada post (aparece ao passar o mouse; no toque fica sempre visível) ou use "Subir" e "Descer" no "⋯". Pelo teclado: Tab até a alça, espaço ou Enter pra pegar, setas pra mover, espaço ou Enter pra soltar e Esc pra cancelar. A lista muda na hora e volta sozinha se o banco recusar. Depois de salvar aparece o aviso "Ordem salva" com o lembrete de que, se o link já foi enviado, o cliente precisa saber que os números mudaram. Os stories têm "Subir", "Descer" e "Mover para outro dia" no "⋯".
- **Desativar e reativar o link:** com o link desativado, a tela do cliente mostra "Esta prévia não existe ou foi removida", a apresentação ganha o selo "Link desativado" e "Copiar link" e "Ver como cliente" só mostram o aviso. Reativar devolve o mesmo link. As mesmas opções aparecem no "⋯" de cada apresentação na página do cliente.
- **Regenerar o link:** troca o token por um novo (o mesmo `nanoid(12)` do seed) depois de uma confirmação. O link antigo deixa de funcionar na hora.

A ordem é salva pela função SQL `reorder_posts`, que confere se a lista tem exatamente os posts da apresentação (sem faltar, sobrar ou repetir) e renumera `position` de 1 a N numa instrução só. Ela roda como quem chama (`security invoker`), então a RLS de `authenticated` continua valendo, e só `authenticated` pode executá-la.

**Conta** (`/admin/conta`, no menu da conta): troca a própria senha. Pede a senha atual (conferida com um login novo antes de trocar), a nova com pelo menos 12 caracteres e a confirmação. Não precisa sair e entrar de novo. Esquecer a senha continua sendo resolvido pelo dashboard do Supabase.

### Stories

Os modelos de story da semana não aparecem no feed: cada um é uma arte 9:16 exportada do Canva, sem legenda, organizada pelo dia de publicação. O cliente só visualiza e pede ajuste pelo WhatsApp citando o número do story.

- **Painel** (`/admin/apresentacoes/<id>`, seção "Stories"): escolha o dia e várias imagens de uma vez (JPG, PNG ou WebP, até 20 MB cada, no máximo 30 por apresentação). Elas entram no dia escolhido, na ordem da seleção, com barra de progresso por arquivo. As linhas só são gravadas depois que todos os envios terminam; se um falhar, os já enviados são apagados. Cada story pode subir ou descer dentro do dia, mudar de dia e ser excluído (o arquivo sai do bucket antes da linha). O número vem da ordem (dia e depois posição) e a posição no banco nunca é renumerada.
- **Imagem:** passa pelo mesmo redimensionamento dos posts (até 1080 px de largura, sem ampliar nem recortar, JPEG 0,82, orientação EXIF, fundo branco no PNG transparente) e fica em `presentations/<id>/<uuid>.jpg`, na mesma pasta dos posts. Por isso a exclusão da apresentação, a limpeza em lote e o medidor já contam os stories.
- **Tela do cliente:** com stories, a foto do perfil ganha um anel e vira um botão. O anel é colorido enquanto houver story não visto naquele aparelho e fica cinza quando todos foram vistos (guardado no `localStorage`, por token: cada semana começa colorida de novo). Um balão "Toque na foto para ver os stories da semana" aparece uma vez por aparelho. O contador do topo ganha "· N stories", e uma apresentação com 1 post e stories mostra o grid em vez de abrir o post direto. Se o `localStorage` estiver bloqueado, o anel fica sempre colorido, o balão sempre aparece e nada quebra.
- **Visualizador** (`?story=N`, então voltar fecha e o link pode ser compartilhado): fundo preto, a arte inteira sem corte, barras de progresso do dia, atalhos pra cada dia ("Seg 12") e "Segunda, 12/10 · Story 3 de 8". Avança sozinho a cada 5 s; toque à direita avança, à esquerda volta, segurar pausa, deslizar pra baixo ou Esc fecha e as setas do teclado navegam. Com "reduzir movimento" ligado no aparelho, só avança manualmente.
- **Datas:** o dia é só data, sem hora, e é formatado em UTC a partir de `YYYY-MM-DD`, pra um fuso a oeste de Greenwich não mostrar o dia anterior.

O anel imita só a convenção visual dos stories: nada de logo, nome ou ícones do Instagram.

### Compressão de vídeo

Os vídeos chegam do iPhone em HEVC, passam pelo CapCut e saem em `.mov`, quase sempre acima de 50 MB. O plano gratuito do Supabase aceita 50 MB por arquivo e 1 GB no total, e o HEVC não toca em todo navegador. Por isso o painel converte o vídeo no computador de quem está montando a semana, com o [ffmpeg.wasm](https://ffmpegwasm.netlify.app), antes de enviar. Nenhum vídeo passa por rota ou action do Next e não há custo de servidor.

- **Entrada:** MP4 ou MOV, em HEVC ou H.264, de até 300 MB. Acima disso o painel recusa, porque o navegador fica sem memória.
- **Saída:** MP4 em H.264 (libx264, CRF 26, preset veryfast, `yuv420p`) com áudio AAC a 128 kbps, lado menor de 720 px (sem ampliar vídeo menor), até 30 fps e `faststart`. A rotação do iPhone é aplicada.
- **Limite de 50 MB:** se o resultado passar disso, o painel tenta mais uma vez com CRF 30. Se ainda passar, mostra o erro.
- **Capa:** sai de um quadro do vídeo comprimido (1 s), em JPEG de 1080 px de largura. Um controle deslizante escolhe outro quadro, e ainda dá pra enviar uma imagem.
- **Durante a compressão:** barra de progresso, botão de cancelar e o botão de salvar bloqueado. A aba precisa ficar aberta.
- **Se o ffmpeg não carregar** (rede, navegador) ou não conseguir converter o arquivo: o original é enviado sem compressão, com aviso, desde que tenha até 50 MB. Acima disso é erro.
- **HDR (HLG ou PQ):** o painel detecta, converte pra SDR (BT.709) e avisa pra conferir a cor. Sem essa conversão a cor sai lavada.

O ffmpeg (~32 MB) só é baixado quando alguém escolhe um vídeo, do jsDelivr, e não fica no repositório. As versões são fixas (`@ffmpeg/ffmpeg` 0.12.15 e `@ffmpeg/core` 0.12.10) e o navegador confere o SHA-384 de cada arquivo antes de usar: a lista está em `lib/ffmpeg-assets.ts`. É o núcleo de uma thread, que dispensa `SharedArrayBuffer` e os cabeçalhos COOP/COEP. O pacote `@ffmpeg/ffmpeg` do `package.json` entra só pelos tipos, porque o Turbopack não empacota o worker dele.

O que esperar, medido num notebook com Edge, com amostras geradas a partir do vídeo de exemplo (o tempo cresce com a duração, e vídeo com mais movimento fica maior):

| Entrada | Tamanho | Saída | Tempo |
|---|---|---|---|
| HEVC 1080×1920, 30 fps, 60 s | 71,6 MB | 8,8 MB | 3 min 4 s |
| HEVC 1080×1920, 30 fps, 2 min | 236,6 MB | 17,2 MB | 4 min 17 s |
| HEVC 2160×3840 (4K), 60 fps, 15 s | 69,4 MB | 2,4 MB | 1 min 20 s |
| H.264 720×1280, 12 s (`public/sample/reels.mp4`) | 2,4 MB | 2,1 MB | 15 a 30 s |

Limites conhecidos: uma thread só, então a conversão leva de 2 a 3 vezes a duração do vídeo; funciona em navegador de computador (não foi testado no celular); e a conversão de HDR foi conferida só com um HLG sintético, não com um vídeo HDR real do iPhone.

### Armazenamento e limpeza

Tudo cabe no plano gratuito do Supabase: 1 GB de arquivos e 500 MB de banco. A equipe guarda só as últimas 3 semanas de cada cliente, porque os originais ficam no Drive e as legendas no Notion.

- **Medidor:** o rodapé da barra lateral mostra "X MB de 1 GB" com uma barra fina, neutra até 70%, amarela acima de 70% e vermelha acima de 90%. O limite é a constante `STORAGE_LIMIT_BYTES` em `lib/storage-rules.ts`. O medidor conta só os arquivos do bucket `media`, não o banco.
- **Idade e peso:** na página do cliente, cada apresentação mostra os dias desde a criação, o tamanho em MB e o número de posts. Com mais de 21 dias (`OLD_PRESENTATION_DAYS`) ela ganha o selo "Antiga".
- **Limpeza em lote:** em `/admin/armazenamento`, a lista "Apresentações antigas" lista as que passaram de 21 dias, com caixas de seleção e o total. "Apagar selecionadas" pede confirmação em tela com o resumo. Cada apresentação perde primeiro os arquivos do bucket e depois a linha; se algum arquivo falhar, a linha daquela fica, o erro aparece e as demais seguem. No fim o painel diz quantas saíram e quantos MB foram liberados, e o medidor é atualizado. Nada é apagado sozinho ou por agendamento, e o servidor recusa apagar por ali uma apresentação com 21 dias ou menos.

O painel continua sem `service_role`. As somas vêm de duas funções SQL `security definer` (`media_usage_bytes()` e `media_usage_by_presentation()`, migration `20261014120000_medidor_de_armazenamento.sql`), que só devolvem totais e só podem ser chamadas por `authenticated`. O `pnpm check:anon` confere que a `anon key` não consegue chamá-las.

### Teste de ponta a ponta

`pnpm test:e2e` abre o painel num navegador de verdade (Playwright, usando o Edge já instalado) contra um app rodando e o Supabase real. Ele cria um usuário temporário pela API admin, com senha aleatória que só existe na memória, percorre login, cliente, apresentação, os três tipos de post (com a compressão do vídeo, a capa automática e o envio sem compressão quando o CDN falha), a tela do cliente, o tamanho e a idade das apresentações (uma delas tem o `created_at` recuado 30 dias pra ganhar o selo), a limpeza em lote com o medidor, os stories (envio em lote, anel, balão, visualizador, teclado, pausa, movimento reduzido, `localStorage` bloqueado e exclusão) e as exclusões, e no final apaga o usuário, os dados e os arquivos de teste.

```bash
pnpm build
CRON_SECRET=<o-mesmo-nos-dois> pnpm start        # num terminal
CRON_SECRET=<o-mesmo-nos-dois> pnpm test:e2e     # em outro
```

O teste precisa de internet, porque a compressão baixa o ffmpeg do CDN. Com um `ffmpeg` instalado no sistema (no `PATH`), ele também gera na hora um HEVC curto em `.mov`, como o do iPhone, e confere que sai em H.264 720×1280 e toca na tela do cliente; sem ele, esse passo é pulado.

`pnpm test` roda os testes de unidade (validação das variáveis, mensagens de erro do login, compressão de vídeo, armazenamento e as regras dos stories), sem rede.

`E2E_BASE_URL` muda o endereço do app (padrão `http://localhost:3000`) e `E2E_BROWSER` muda o navegador (padrão `msedge`; use `chrome` se preferir). Sem `CRON_SECRET`, o passo do keep-alive com segredo é pulado.

### Quem acessa o quê

| Papel | Tabelas | Bucket `media` |
|---|---|---|
| Público (`anon`) | nada | nada |
| Equipe logada (`authenticated`) | lê e escreve | lê e escreve |
| Servidor (`service_role`) | tudo | tudo |

A tela do cliente nunca fala com o banco: o servidor recebe o token, busca só aquela apresentação com a `service_role` e devolve URLs assinadas. A `service_role` só é lida em `lib/supabase/server.ts` (protegido por `server-only`, usado pela tela do cliente e pelo keep-alive) e nos scripts `seed.ts` e `e2e.ts`.

O painel não usa a `service_role`: ele lê e escreve com a `anon key` e a sessão de quem entrou, então vale o RLS de `authenticated`. Cada página e cada Server Action confere o login no servidor com `getUser()` (`requireStaff()`); o `proxy.ts` só renova a sessão e redireciona quem não entrou.

Pra conferir que o público não acessa nada direto (tabelas, inclusive escrever em `stories`, bucket, as funções do medidor e a `reorder_posts`), usando só a `anon key`:

```bash
pnpm check:anon <caminho-de-um-arquivo-no-bucket>
```

O `pnpm seed` imprime esse comando já com um caminho real.

### Quando o login falha

Senha ou e-mail errados mostram "E-mail ou senha incorretos.". Qualquer outra falha (chave pública inválida, 401/403, rede, variável ausente ou mal formatada) mostra "Erro de configuração ou de conexão." e deixa uma linha `[login]` no log do servidor (na Vercel: Logs do projeto) com o `status`, o `code` e o `name` do erro, ou com o nome da variável com problema. O log nunca leva e-mail, senha nem chave.

### Deploy na Vercel

Importe o repositório na Vercel e cadastre as três variáveis de ambiente listadas acima. Sem elas o deploy funciona só no modo demo.

### Keep-alive

Projeto gratuito do Supabase pausa depois de cerca de 7 dias sem atividade. O `vercel.json` agenda um cron diário (12h UTC) em `/api/cron/keepalive`, que lê uma linha de `clients` e responde `{ "ok": true }`. Nos logs da Vercel aparecem `[keepalive] ok`, `[keepalive] não autorizado` ou `[keepalive] falhou` com o status e o código do erro; o segredo e o header `Authorization` nunca são registrados.

A rota só responde com `Authorization: Bearer <CRON_SECRET>`; sem isso devolve 401. Crie a variável `CRON_SECRET` nas Settings do projeto na Vercel, em Production, com um texto aleatório longo: a Vercel manda esse header sozinha nas chamadas do cron. Sem a variável, o cron recebe 401 e o projeto não é mantido acordado.

## Identidade visual

O painel e as páginas públicas usam a marca da Rabisco (terracota, mostarda e creme; Open Sans no texto e Hanken Grotesk nos títulos). A tela do cliente (`/p/<token>`) continua com o visual aprovado; dela só mudaram o favicon e a assinatura no rodapé.

- **Cores do painel:** só em `app/admin/theme.css`, dentro de `.admin` (claro) e `html[data-admin-theme="dark"] .admin` (escuro). Se mudar `--bg`, mude também o fundo do `<html>` no fim do mesmo arquivo e o `themeColor` de `app/admin/layout.tsx`.
- **Cores das páginas públicas** (início, link inexistente, 404 e erro): em `app/public-theme.css`, dentro de `.public-page`. Seguem o tema do aparelho, não o do painel.
- **Contraste:** depois de trocar qualquer cor, rode `pnpm check:contrast`. Ele lê os dois arquivos e confere os pares usados (AA: 4.5:1 pra texto, 3:1 pra texto grande e componentes de UI).
- **Fontes:** em `app/fonts.ts`. A Hanken Grotesk está no lugar da HK Sentiments, que não está no Google Fonts: com os `.woff2` licenciados, troque o `Hanken_Grotesk` por `next/font/local` mantendo `variable: "--font-brand-display"`.
- **Logo e favicon:** os originais ficam em `public/brand/`. Troque-os e rode `pnpm brand:assets`, que recorta e gera as versões de `public/brand/web/`; depois copie `favicon-48.png` pra `app/icon.png` e `apple-touch-icon.png` pra `app/apple-icon.png` (o favicon vale pra todas as rotas).
- **Assinatura:** "Plataforma criada por …", com nome e link em `lib/site.ts` (componente `components/creator-credit.tsx`).

Restos do teste de ponta a ponta (cliente "Teste E2E …", usuário de teste) podem ser listados sem apagar nada com `pnpm e2e:leftovers`.

## Estrutura

```
app/p/[token]/page.tsx        rota do cliente: busca a apresentação pelo token
app/page.tsx, app/not-found.tsx páginas públicas com a marca (início e 404)
app/public-theme.css          tokens das páginas públicas (seguem o tema do aparelho)
app/fonts.ts                  Open Sans e Hanken Grotesk (next/font)
app/icon.png, apple-icon.png  favicon da Rabisco em todas as rotas
app/admin/
  theme.css                   tokens do painel: cor, fonte, raio, sombra e movimento
  layout.tsx                  tema claro/escuro sem flash e fontes do painel
  login/page.tsx              login da equipe
  (painel)/                   início, clientes, apresentações, armazenamento e conta
  actions.ts                  Server Actions do painel, com validação (zod) e conferência do bucket
app/api/cron/keepalive/       rota do cron que mantém o Supabase acordado
proxy.ts                      renova a sessão em /admin e redireciona quem não entrou
vercel.json                   agenda o cron diário
components/
  admin/                      telas e formulários do painel
  admin/primitives/           dialog, menu ⋯, dropzone, selo, toast, esqueleto, título
  admin/shell/                barra lateral, gaveta do celular, menu da conta e tema
  public-page.tsx             página pública com a marca
  creator-credit.tsx          assinatura do criador
  presentation-view.tsx       alterna entre grid e visualizador conforme ?post=N
  profile-grid.tsx            faixa do topo, perfil, grid 3:4 e silhuetas
  post-viewer.tsx             visualizador em tela cheia (post, carrossel, Reels)
  story-viewer.tsx            visualizador de stories em tela cheia
  carousel.tsx                carrossel com swipe, setas, contador e bolinhas
lib/
  types.ts                    Media, Post, Client, Presentation
  data.ts                     getPresentationByToken(token)
  admin-data.ts               leituras do painel (clientes, apresentações e posts)
  media.ts                    regras de mídia: tamanhos, tipos e caminhos no bucket
  presentation-rules.ts       reordenação, link ativo e regras da senha nova
  storage-rules.ts            medidor de armazenamento, idade das apresentações e limpeza em lote
  stories.ts                  regras dos stories: datas, numeração, avanço, anel e balão
  story-storage.ts            stories vistos e dica dispensada no localStorage, com try/catch
  image.ts                    redimensiona imagem e avatar no navegador
  video.ts                    comprime o vídeo com o ffmpeg.wasm e tira a capa de um quadro
  video-rules.ts              limites e decisões da compressão (o que o pnpm test cobre)
  ffmpeg-assets.ts            arquivos do ffmpeg no CDN, com versão e hash
  upload.ts                   envio direto do navegador pro bucket, com progresso
  token.ts                    gera o token do link (painel e seed)
  site.ts                     nome e link da assinatura do criador
  admin-theme.ts              tema do painel (Claro/Escuro/Sistema) e o script sem flash
  admin-shell.ts              leituras da barra lateral, uma vez por requisição
  supabase/server.ts          cliente com a service_role, só no servidor
  supabase/session.ts         cliente de servidor com a sessão da equipe e requireStaff()
  supabase/browser.ts         cliente de navegador com a sessão da equipe
  sample-data.ts              dados de exemplo da Conecte Telecom (modo demo e seed)
scripts/
  seed.ts                     cria a apresentação de exemplo no Supabase
  check-anon.ts               prova que a anon key não lê nada
  e2e.ts                      teste de ponta a ponta do painel
  e2e-leftovers.ts            lista o que rodadas interrompidas do e2e deixaram (sem apagar)
  check-contrast.ts           confere o contraste dos tokens (WCAG AA)
  brand-assets.ts             gera as versões web do logo e do favicon
supabase/migrations/          tabelas, RLS, bucket e funções (medidor e reorder_posts)
public/sample/                arquivos de mídia do exemplo
```

Os componentes recebem os dados por props e só `lib/data.ts` sabe de onde eles vêm.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · Supabase (Postgres, Auth, Storage) · ffmpeg.wasm · dnd-kit · zod · Playwright (teste) · pnpm

## Sobre os dados de exemplo

O exemplo usa a marca e o conteúdo da **Conecte Telecom**, com autorização da empresa. Dados de outros clientes da Rabisco não entram neste repositório.
