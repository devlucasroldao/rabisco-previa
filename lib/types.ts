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
