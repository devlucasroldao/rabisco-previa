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

**Etapa 3 de 6: painel com login, clientes, apresentações e posts adicionados um por vez.** Ficam pra Etapa 4: upload em massa, agrupar arquivos em carrossel, reordenar posts arrastando e compressão de vídeo.

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

O painel fica em <http://localhost:3000/admin> e não tem cadastro nem "esqueci a senha": crie os usuários da equipe no Supabase, em Authentication > Users > Add user, com e-mail, senha e "Auto Confirm User". Troca de senha também é pelo dashboard.

- **Clientes** (`/admin`): nome, @, bio e foto. A foto é recortada em quadrado de 320×320 no navegador. Excluir um cliente pede o @ digitado e apaga as apresentações, os posts e os arquivos dele.
- **Apresentações** (`/admin/clientes/<id>`): criar com um título, copiar o link do cliente, ver como cliente e excluir.
- **Posts** (`/admin/apresentacoes/<id>`): um por vez. Post tem 1 imagem, carrossel tem de 2 a 10 (com subir e descer pra ordenar) e Reels tem 1 vídeo e 1 capa. A legenda aceita até 2200 caracteres.

As imagens são redimensionadas no navegador pra até 1080 px de largura, em JPEG. O vídeo ainda vai sem compressão: MP4 ou MOV de até 50 MB, que é o limite por arquivo do plano gratuito do Supabase. Mande em H.264, porque o HEVC do iPhone pode não tocar no Chrome.

Os arquivos vão direto do navegador pro bucket, com a sessão de quem entrou, e nunca passam pelas funções do Next (a Vercel limita o corpo da requisição a cerca de 4,5 MB). O post só é gravado depois que todos os envios terminam, e o servidor confere no bucket o tipo e o tamanho de cada arquivo antes de gravar.

Excluir um post, uma apresentação ou um cliente apaga primeiro os arquivos do bucket e depois a linha no banco. Excluir um post muda o número dos seguintes na tela do cliente: se o link já foi enviado, crie outra apresentação.

### Teste de ponta a ponta

`pnpm test:e2e` abre o painel num navegador de verdade (Playwright, usando o Edge já instalado) contra um app rodando e o Supabase real. Ele cria um usuário temporário pela API admin, com senha aleatória que só existe na memória, percorre login, cliente, apresentação, os três tipos de post, a tela do cliente e as exclusões, e no final apaga o usuário, os dados e os arquivos de teste.

```bash
pnpm build
CRON_SECRET=<o-mesmo-nos-dois> pnpm start        # num terminal
CRON_SECRET=<o-mesmo-nos-dois> pnpm test:e2e     # em outro
```

`E2E_BASE_URL` muda o endereço do app (padrão `http://localhost:3000`) e `E2E_BROWSER` muda o navegador (padrão `msedge`; use `chrome` se preferir). Sem `CRON_SECRET`, o passo do keep-alive com segredo é pulado.

### Quem acessa o quê

| Papel | Tabelas | Bucket `media` |
|---|---|---|
| Público (`anon`) | nada | nada |
| Equipe logada (`authenticated`) | lê e escreve | lê e escreve |
| Servidor (`service_role`) | tudo | tudo |

A tela do cliente nunca fala com o banco: o servidor recebe o token, busca só aquela apresentação com a `service_role` e devolve URLs assinadas. A `service_role` só é lida em `lib/supabase/server.ts` (protegido por `server-only`, usado pela tela do cliente e pelo keep-alive) e nos scripts `seed.ts` e `e2e.ts`.

O painel não usa a `service_role`: ele lê e escreve com a `anon key` e a sessão de quem entrou, então vale o RLS de `authenticated`. Cada página e cada Server Action confere o login no servidor com `getUser()` (`requireStaff()`); o `proxy.ts` só renova a sessão e redireciona quem não entrou.

Pra conferir que o público não acessa nada direto, usando só a `anon key`:

```bash
pnpm check:anon <caminho-de-um-arquivo-no-bucket>
```

O `pnpm seed` imprime esse comando já com um caminho real.

### Deploy na Vercel

Importe o repositório na Vercel e cadastre as três variáveis de ambiente listadas acima. Sem elas o deploy funciona só no modo demo.

### Keep-alive

Projeto gratuito do Supabase pausa depois de cerca de 7 dias sem atividade. O `vercel.json` agenda um cron diário (12h UTC) em `/api/cron/keepalive`, que lê uma linha de `clients` e responde `{ "ok": true }`.

A rota só responde com `Authorization: Bearer <CRON_SECRET>`; sem isso devolve 401. Crie a variável `CRON_SECRET` nas Settings do projeto na Vercel, em Production, com um texto aleatório longo: a Vercel manda esse header sozinha nas chamadas do cron. Sem a variável, o cron recebe 401 e o projeto não é mantido acordado.

## Estrutura

```
app/p/[token]/page.tsx        rota do cliente: busca a apresentação pelo token
app/admin/
  login/page.tsx              login da equipe
  (painel)/                   clientes, apresentações e posts, atrás do login
  actions.ts                  Server Actions do painel, com validação (zod) e conferência do bucket
app/api/cron/keepalive/       rota do cron que mantém o Supabase acordado
proxy.ts                      renova a sessão em /admin e redireciona quem não entrou
vercel.json                   agenda o cron diário
components/
  admin/                      formulários do painel
  presentation-view.tsx       alterna entre grid e visualizador conforme ?post=N
  profile-grid.tsx            faixa do topo, perfil, grid 3:4 e silhuetas
  post-viewer.tsx             visualizador em tela cheia (post, carrossel, Reels)
  carousel.tsx                carrossel com swipe, setas, contador e bolinhas
lib/
  types.ts                    Media, Post, Client, Presentation
  data.ts                     getPresentationByToken(token)
  admin-data.ts               leituras do painel (clientes, apresentações e posts)
  media.ts                    regras de mídia: tamanhos, tipos e caminhos no bucket
  image.ts                    redimensiona imagem e avatar no navegador
  upload.ts                   envio direto do navegador pro bucket, com progresso
  token.ts                    gera o token do link (painel e seed)
  supabase/server.ts          cliente com a service_role, só no servidor
  supabase/session.ts         cliente de servidor com a sessão da equipe e requireStaff()
  supabase/browser.ts         cliente de navegador com a sessão da equipe
  sample-data.ts              dados de exemplo da Conecte Telecom (modo demo e seed)
scripts/
  seed.ts                     cria a apresentação de exemplo no Supabase
  check-anon.ts               prova que a anon key não lê nada
  e2e.ts                      teste de ponta a ponta do painel
supabase/migrations/          tabelas, RLS e bucket
public/sample/                arquivos de mídia do exemplo
```

Os componentes recebem os dados por props e só `lib/data.ts` sabe de onde eles vêm.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · Supabase (Postgres, Auth, Storage) · zod · Playwright (teste) · pnpm

## Sobre os dados de exemplo

O exemplo usa a marca e o conteúdo da **Conecte Telecom**, com autorização da empresa. Dados de outros clientes da Rabisco não entram neste repositório.
