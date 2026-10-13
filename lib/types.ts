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

export type Presentation = {
  title: string;
  token: string;
  client: Client;
  posts: Post[];
};
