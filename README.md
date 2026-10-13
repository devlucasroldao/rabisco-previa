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

**Etapa 2 de 6: a tela do cliente lê do Supabase.** Ainda não há painel nem upload pela interface; os dados entram por um script de seed.

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

### Quem acessa o quê

| Papel | Tabelas | Bucket `media` |
|---|---|---|
| Público (`anon`) | nada | nada |
| Equipe logada (`authenticated`) | lê e escreve | lê e escreve |
| Servidor (`service_role`) | tudo | tudo |

A tela do cliente nunca fala com o banco: o servidor recebe o token, busca só aquela apresentação com a `service_role` e devolve URLs assinadas. A `service_role` só é lida em `lib/supabase/server.ts` (protegido por `server-only`) e em `scripts/seed.ts`.

Pra conferir que o público não acessa nada direto, usando só a `anon key`:

```bash
pnpm check:anon <caminho-de-um-arquivo-no-bucket>
```

O `pnpm seed` imprime esse comando já com um caminho real.

### Deploy na Vercel

Importe o repositório na Vercel (o padrão de Next.js serve, sem `vercel.json`) e cadastre as três variáveis de ambiente listadas acima. Sem elas o deploy funciona só no modo demo.

## Estrutura

```
app/p/[token]/page.tsx        rota do cliente: busca a apresentação pelo token
components/
  presentation-view.tsx       alterna entre grid e visualizador conforme ?post=N
  profile-grid.tsx            faixa do topo, perfil, grid 3:4 e silhuetas
  post-viewer.tsx             visualizador em tela cheia (post, carrossel, Reels)
  carousel.tsx                carrossel com swipe, setas, contador e bolinhas
lib/
  types.ts                    Media, Post, Client, Presentation
  data.ts                     getPresentationByToken(token)
  supabase/server.ts          cliente com a service_role, só no servidor
  sample-data.ts              dados de exemplo da Conecte Telecom (modo demo e seed)
scripts/
  seed.ts                     cria a apresentação de exemplo no Supabase
  check-anon.ts               prova que a anon key não lê nada
supabase/migrations/          tabelas, RLS e bucket
public/sample/                arquivos de mídia do exemplo
```

Os componentes recebem os dados por props e só `lib/data.ts` sabe de onde eles vêm.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · Supabase (Postgres, Storage) · pnpm

## Sobre os dados de exemplo

O exemplo usa a marca e o conteúdo da **Conecte Telecom**, com autorização da empresa. Dados de outros clientes da Rabisco não entram neste repositório.
