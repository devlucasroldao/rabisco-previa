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

**Etapa 1 de 6: tela do cliente, com dados de exemplo locais.** Ainda não há Supabase, painel nem upload.

- `/p/demo`: perfil, grid e visualizador com um Reels, um carrossel e um post
- `/p/single`: apresentação de um conteúdo só, que abre direto no visualizador
- qualquer outro token: "Esta prévia não existe ou foi removida"

O post aberto fica na URL (`/p/demo?post=2`), então o voltar do navegador fecha o visualizador e o link de um post pode ser compartilhado.

## Como rodar

Precisa de Node 20.9+ e [pnpm](https://pnpm.io).

```bash
pnpm install
pnpm dev
```

Abra <http://localhost:3000/p/demo>. Pra ver como o cliente vê, use o modo de dispositivo do DevTools em 390×844.

Outros comandos: `pnpm build`, `pnpm start` e `pnpm lint`.

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
  sample-data.ts              dados de exemplo da Conecte Telecom
public/sample/                arquivos de mídia do exemplo
```

Os componentes recebem os dados por props e só `lib/data.ts` sabe de onde eles vêm. Na Etapa 2, `getPresentationByToken` passa a consultar o Supabase e o resto não muda.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · pnpm

## Sobre os dados de exemplo

O exemplo usa a marca e o conteúdo da **Conecte Telecom**, com autorização da empresa. Dados de outros clientes da Rabisco não entram neste repositório.
