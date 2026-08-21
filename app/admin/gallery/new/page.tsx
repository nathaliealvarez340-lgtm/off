import { GalleryPostEditor } from "@/components/GalleryPostEditor";
import { requireAdmin } from "@/lib/auth";

export default async function NewGalleryPostPage() {
  await requireAdmin();
  return <GalleryPostEditor />;
}
