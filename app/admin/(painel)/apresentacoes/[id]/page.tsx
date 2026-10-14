import { Suspense } from "react";
import Link from "next/link";
import { CopyLinkButton } from "@/components/admin/copy-link-button";
import { PostsEditor } from "@/components/admin/posts-editor";
import { PresentationTitleForm } from "@/components/admin/presentation-title-form";
import { StoriesEditor } from "@/components/admin/stories-editor";
import { secondaryButtonClass } from "@/components/admin/ui";
import { getPresentation } from "@/lib/admin-data";

export default function Page({
  params,
}: PageProps<"/admin/apresentacoes/[id]">) {
  return (
    <Suspense fallback={null}>
      <PresentationLoader params={params} />
    </Suspense>
  );
}

async function PresentationLoader({
  params,
}: Pick<PageProps<"/admin/apresentacoes/[id]">, "params">) {
  const { id } = await params;
  const presentation = await getPresentation(id);

  if (!presentation) {
    return (
      <>
        <Link href="/admin" className="text-[13px] text-muted hover:underline">
          ← Clientes
        </Link>
        <p className="mt-6 text-[14px] text-muted">
          Esta apresentação não existe ou foi removida.
        </p>
      </>
    );
  }
  const { client, posts, stories, title, token } = presentation;

  return (
    <>
      <Link
        href={`/admin/clientes/${client.id}`}
        className="text-[13px] text-muted hover:underline"
      >
        ← {client.name}
      </Link>
      <div className="mt-2 mb-6 flex flex-wrap items-center gap-2">
        <h1 className="min-w-0 flex-1 basis-60 truncate text-[20px] font-semibold">
          {title}
        </h1>
        <CopyLinkButton token={token} />
        <a
          href={`/p/${token}`}
          target="_blank"
          rel="noreferrer"
          className={secondaryButtonClass}
        >
          Ver como cliente
        </a>
      </div>
      <PresentationTitleForm id={presentation.id} title={title} />

      <section className="mt-10">
        <h2 className="mb-4 text-[16px] font-semibold">Posts</h2>
        <PostsEditor presentationId={presentation.id} posts={posts} />
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-[16px] font-semibold">Stories</h2>
        <StoriesEditor presentationId={presentation.id} stories={stories} />
      </section>
    </>
  );
}
