import { Suspense } from "react";
import { LinkControls } from "@/components/admin/link-controls";
import { PostsEditor } from "@/components/admin/posts-editor";
import { PageHeader } from "@/components/admin/primitives/page-header";
import { ListSkeleton, Skeleton } from "@/components/admin/primitives/skeleton";
import { PresentationTitleForm } from "@/components/admin/presentation-title-form";
import { StoriesEditor } from "@/components/admin/stories-editor";
import { getPresentation } from "@/lib/admin-data";

export default function Page({
  params,
}: PageProps<"/admin/apresentacoes/[id]">) {
  return (
    <Suspense
      fallback={
        <>
          <HeaderSkeleton />
          <ListSkeleton label="Carregando a apresentação" />
        </>
      }
    >
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
        <PageHeader
          title="Apresentação não encontrada"
          crumbs={[{ label: "Início", href: "/admin" }]}
        />
        <p className="text-[14px] text-muted">
          Esta apresentação não existe ou foi removida.
        </p>
      </>
    );
  }
  const { active, client, posts, stories, title, token } = presentation;

  return (
    <>
      <PageHeader
        title={title}
        crumbs={[
          { label: "Início", href: "/admin" },
          { label: client.name, href: `/admin/clientes/${client.id}` },
        ]}
        actions={
          <LinkControls
            presentationId={presentation.id}
            token={token}
            active={active}
            regenerate
          />
        }
      />
      <PresentationTitleForm id={presentation.id} title={title} />

      <section className="mt-10">
        <h2 className="mb-4 text-[18px] font-semibold">Posts</h2>
        <PostsEditor presentationId={presentation.id} posts={posts} />
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-[18px] font-semibold">Stories</h2>
        <StoriesEditor presentationId={presentation.id} stories={stories} />
      </section>
    </>
  );
}

function HeaderSkeleton() {
  return (
    <div role="status" aria-label="Carregando" className="mb-8 space-y-3">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-64" />
    </div>
  );
}
