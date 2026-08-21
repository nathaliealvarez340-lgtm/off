import { GalleryPostEditor } from "@/components/GalleryPostEditor";
import { requireAdmin } from "@/lib/auth";

export default async function NewContentPostPage() {
  await requireAdmin();
  return <GalleryPostEditor />;
}
