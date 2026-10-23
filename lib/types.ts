export type Media = { url: string; kind: "image" | "video"; poster?: string };

export type Post = {
  id: string;
  position: number;
  type: "post" | "carousel" | "reels";
  caption: string;
  media: Media[];
};

export type Client = {
  name: string;
  handle: string;
  bio: string;
  avatarUrl: string;
};

// day é a data de publicação, "YYYY-MM-DD". number vai de 1 a T, na ordem de
// dia e depois de position.
export type Story = {
  id: string;
  day: string;
  number: number;
  url: string;
};

export type Presentation = {
  title: string;
  token: string;
  client: Client;
  posts: Post[];
  stories: Story[];
};

// Calendário Mensal -----------------------------------------------------

export type ContentType =
  | "post"
  | "carrossel"
  | "reels"
  | "story"
  | "campanha"
  | "anuncio"
  | "enquete";

// description é opcional: só os itens que têm o que detalhar abrem pro cliente.
export type CalendarItem = {
  id: string;
  day: string; // "YYYY-MM-DD"
  position: number;
  contentType: ContentType;
  title: string;
  description: string | null;
};

export type Calendar = {
  title: string;
  month: string; // "YYYY-MM-DD" (primeiro dia do mês)
  token: string;
  client: Client;
  items: CalendarItem[];
};
