# Rabisco Prévia — Especificação v1

> Ferramenta interna da Rabisco para apresentar o conteúdo da semana aos clientes por link, com cara de Instagram.
> Status: escopo aprovado em 13/10/2026 · Repositório: github.com/devlucasroldao/rabisco-previa (público, portfólio)

## 1. Problema

Hoje o conteúdo semanal vai para o cliente numa pasta zipada pelo WhatsApp. O cliente não vê como o post vai ficar no feed, a legenda chega separada da arte, e o feedback ("muda aquele azul") não diz de qual post está falando.

## 2. Solução

Um link por semana. O cliente abre no celular, vê um perfil parecido com o do Instagram, com o grid dos próximos posts numerados, e toca em cada post pra ver a arte, o carrossel, o Reels e a legenda. O feedback continua pelo WhatsApp, por print e citando o número do post.

## 3. Usuários

| Quem | Acesso | Faz o quê |
|---|---|---|
| Lucas e Júlia (Rabisco) | Login com e-mail e senha (Supabase Auth) | Cadastram clientes, montam a semana, copiam o link |
| Cliente (2 a 3 pessoas por empresa) | Link com token, **sem login** | Só visualiza |

## 4. Escopo da v1

### Tela do cliente (`/p/[token]`), mobile first
- Faixa no topo com "Prévia da semana" e "N conteúdos · Rabisco"
- Perfil com foto, @, nome e bio. **Sem** número de posts ou seguidores, **sem** link na bio
- Aba única, "PRÓXIMOS POSTS"
- Grid de 3 colunas na proporção **3:4**, com 2px de espaço. Cada miniatura tem:
  - número do post no canto superior esquerdo
  - ícone de carrossel ou de Reels no canto superior direito
- **Silhuetas vazias** depois dos posts: completam a linha e acrescentam mais 2 fileiras, cada uma mais transparente que a anterior
- Rodapé com a dica: "Toque num conteúdo para ver em tela cheia. Pra pedir ajuste, mande no WhatsApp o número do post."
- Visualizador em tela cheia:
  - topo com voltar, "Post N de T" e o tipo (Reels, Carrossel · X imagens, Post)
  - linha com o avatar e o @
  - **Post:** imagem 4:5
  - **Carrossel:** 4:5 com swipe por toque, setas, contador "1/4" e bolinhas
  - **Reels:** vídeo 9:16 com controles, `playsinline` e poster
  - legenda com quebras de linha preservadas e hashtags em azul numa linha separada
  - caixa com o texto: "Quer ajustar algo? Tire um print desta tela e mande no WhatsApp com 'Post N: …' e o que quer mudar."
  - botões Anterior e Próximo, que voltam a rolagem pro topo
- Uma apresentação com 1 post só pula o grid e abre direto no visualizador
- Tema claro (padrão) e escuro, que segue `prefers-color-scheme`
- Link inválido mostra a mensagem "Esta prévia não existe ou foi removida"

### Painel (`/admin`), desktop
- Login
- Clientes: criar e editar (nome, @, bio, foto)
- Apresentações do cliente: listar, criar (com título, ex.: "Semana 20–26 out") e excluir
- Montar a apresentação:
  - **upload em massa** arrastando todos os arquivos da semana
  - cada arquivo vira um post. Pra montar um carrossel, seleciona vários e clica em "Agrupar em carrossel"
  - **arrastar pra reordenar**
  - legenda e tipo por post
  - botão **Copiar link**
  - botão **Ver como cliente**
- **Compressão automática de vídeo no navegador**, antes do upload:
  - converte pra H.264 + AAC MP4, 720p, CRF ~26, `faststart`
  - gera a capa (poster) a partir de um quadro do vídeo, que pode ser trocada por uma imagem
  - mostra barra de progresso
  - motivo: o iPhone exporta em HEVC, que não toca em todo navegador, e o arquivo cai de ~12 MB pra ~2,5 MB
- Imagens redimensionadas no navegador pra 1080px de largura, em JPEG com qualidade ~82

### Fora da v1
Aprovar ou pedir ajuste dentro do app · comentários · login do cliente · notificações · histórico de versões · calendário · agendamento ou publicação no Instagram · métricas · senha no link · posts já publicados no grid · registro de quem abriu o link · marca personalizada por cliente.

## 5. Dados (Supabase)

```sql
clients (
  id uuid pk default gen_random_uuid(),
  name text not null,          -- "Conecte Telecom"
  handle text not null,        -- "seconecte2021"
  bio text,
  avatar_path text,
  created_at timestamptz default now()
)

presentations (
  id uuid pk,
  client_id uuid fk -> clients on delete cascade,
  title text not null,
  token text unique not null,  -- 10+ caracteres aleatórios (nanoid)
  created_at timestamptz default now()
)

posts (
  id uuid pk,
  presentation_id uuid fk -> presentations on delete cascade,
  position int not null,
  type text check (type in ('post','carousel','reels')),
  caption text,
  media jsonb not null,        -- [{ "path": "...", "kind": "image"|"video", "poster": "..." }]
  created_at timestamptz default now()
)
```

**Acesso**
- RLS ligado em tudo. Só usuários autenticados leem e escrevem.
- A tela do cliente **não** lê as tabelas direto. Ela usa uma rota de servidor (ou função RPC `security definer`) que recebe o token e devolve só aquela apresentação.
- Storage: bucket `media` privado. A tela do cliente recebe URLs assinadas (validade de algumas horas) geradas no servidor.

## 6. Stack

Next.js (App Router) + TypeScript + Tailwind · Supabase (Postgres, Auth, Storage) · Vercel · `@ffmpeg/ffmpeg` (wasm) pra vídeo · `@dnd-kit` pra reordenar · `nanoid` pro token.

## 7. Ordem de construção

1. Tela do cliente com dados de exemplo da Conecte (uso de marca autorizado)
2. Supabase: tabelas, RLS, storage e a rota pública por token
3. Painel: login, clientes e apresentações
4. Upload em massa, agrupamento em carrossel e reordenação
5. Compressão de vídeo e de imagem
6. Deploy na Vercel e teste com uma semana real da Conecte

## 8. Repositório público (portfólio)

- O seed e os prints do README usam a **Conecte Telecom**, com autorização da empresa para uso da marca. Dados de **outros** clientes da Rabisco ficam só no banco de produção, nunca no repositório.
- Fotos de colaboradores no exemplo: confirmar o ok de cada pessoa que aparece, já que o repositório é público.
- `.env.local` no `.gitignore`. A chave `service_role` nunca vai pro cliente nem pro repositório.
- O README explica o problema, a decisão, a solução e o aprendizado, como conteúdo do "Dev na prática".

## 9. Riscos conhecidos

- **Storage gratuito do Supabase:** conferir os limites atuais do plano. Com compressão e volume semanal pequeno deve caber. Se apertar, os vídeos migram pro Cloudflare R2.
- **ffmpeg.wasm é pesado** (~30 MB) e lento. Carregar só quando houver vídeo, e só no painel.
- **Link vazado** dá acesso à prévia. Pra conteúdo não publicado, o risco é aceitável na v1.
