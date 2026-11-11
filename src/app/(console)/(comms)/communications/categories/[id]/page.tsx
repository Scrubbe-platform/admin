"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { TemplateLibrary } from "@/components/comms/TemplateLibrary";
import { Button, Card } from "@/components/ui/primitives";
import { EmptyState } from "@/components/ui/states";
import { findCategory } from "@/lib/comms/catalog";

export default function CategoryPage() {
  const params = useParams<{ id: string }>();

  if (!findCategory(params.id)) {
    return (
      <Card>
        <EmptyState
          title="That category doesn't exist"
          body="Pick one from the Email Templates list."
          action={
            <Link href="/communications/templates">
              <Button size="sm">All categories</Button>
            </Link>
          }
        />
      </Card>
    );
  }

  return <TemplateLibrary key={params.id} categoryId={params.id} />;
}
