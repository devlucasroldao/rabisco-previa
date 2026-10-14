import type { Client, Post, Presentation, Story } from "./types";

// Dados de exemplo da Conecte Telecom (uso da marca autorizado pela empresa).
// Os arquivos ficam em public/sample/.

const conecte: Client = {
  name: "Conecte Telecom",
  handle: "seconecte2021",
  bio: "Fibra óptica em Arroio do Sal e região\nSuporte presencial todos os dias até às 21h\nPeça sua instalação pelo link",
  avatarUrl: "/sample/avatar.jpg",
};

const reels: Post = {
  id: "sample-reels",
  position: 1,
  type: "reels",
  caption:
    "Às vezes você só precisa de um empurrãozinho pra contratar a Conecte. 😂\nO importante é que o cliente entrou…\nassinou o contrato…\ne agora é só esperar a instalação! 📡🤣\nA gente só deu uma ajudinha no caminho. 👀💙\n#ConecteTelecom #ArroioDoSal #Instalacao #VemPraConecte #Humor",
  media: [
    {
      url: "/sample/reels.mp4",
      kind: "video",
      poster: "/sample/reels-capa.jpg",
    },
  ],
};

const carousel: Post = {
  id: "sample-carousel",
  position: 2,
  type: "carousel",
  caption:
    "Por trás de cada atendimento, instalação, venda e conexão, tem alguém fazendo acontecer. 💙\nHoje é dia de apresentar um pouquinho de quem está por trás da Conecte no dia a dia.\nPorque a Conecte não é só internet. É gente, é equipe, é proximidade e são pessoas que fazem parte da nossa cidade.\nÉ mais que internet, é Conecte. 💙\n#ConecteTelecom #ArroioDoSal #EquipeConecte #PorTrasDaConecte #Humanizacao",
  media: [
    { url: "/sample/car-1.jpg", kind: "image" },
    { url: "/sample/car-2.jpg", kind: "image" },
    { url: "/sample/car-3.jpg", kind: "image" },
    { url: "/sample/car-4.jpg", kind: "image" },
  ],
};

const paz: Post = {
  id: "sample-post",
  position: 3,
  type: "post",
  caption:
    "Encontrar a paz interior pode ser difícil… mas encontrar uma internet de qualidade não precisa ser. 🧘😂\nChega de perder a tranquilidade com travamentos e interrupções.\nCom a Conecte, você encontra internet 100% fibra óptica, planos a partir de R$ 89,90 e suporte humanizado, pertinho de você.\nRespira fundo. A sua próxima conexão pode ser com a Conecte. 💙\nÉ mais que internet, é Conecte.\n#ConecteTelecom #ArroioDoSal #InternetFibra #FibraOptica #ProvedorDeInternet",
  media: [{ url: "/sample/paz.jpg", kind: "image" }],
};

// Os stories do exemplo reaproveitam as artes do carrossel e a capa do Reels.
const stories: Story[] = [
  { id: "sample-story-1", day: "2026-10-12", number: 1, url: "/sample/reels-capa.jpg" },
  { id: "sample-story-2", day: "2026-10-12", number: 2, url: "/sample/car-2.jpg" },
  { id: "sample-story-3", day: "2026-10-14", number: 3, url: "/sample/car-4.jpg" },
];

export const samplePresentations: Presentation[] = [
  {
    title: "Semana de exemplo",
    token: "demo",
    client: conecte,
    posts: [reels, carousel, paz],
    stories,
  },
  {
    title: "Conteúdo único",
    token: "single",
    client: conecte,
    posts: [{ ...paz, position: 1 }],
    stories: [],
  },
];
