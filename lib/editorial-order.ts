type EditorialItem = {
  title: string;
  category?: string | null;
  slug?: string | null;
  publishedAt?: Date | string | null;
  createdAt?: Date | string | null;
};

const EDITION_PATTERN = /(?:cap(?:itulo|ítulo)?|chapter|ed(?:icion|ición|ition)?|vol(?:umen|ume)?)[^0-9]{0,10}([0-9]+)/i;

export function getEditorialSequence(item: EditorialItem) {
  const source = [item.category, item.title, item.slug].filter(Boolean).join(" ");
  const explicit = source.match(EDITION_PATTERN)?.[1];
  if (explicit) return Number(explicit);

  const date = item.publishedAt ?? item.createdAt;
  const timestamp = date ? new Date(date).getTime() : Number.MAX_SAFE_INTEGER;
  return Number.isFinite(timestamp) ? 1_000_000_000 + timestamp : Number.MAX_SAFE_INTEGER;
}

export function sortEditorially<T extends EditorialItem>(items: T[]) {
  return [...items].sort((left, right) => {
    const sequence = getEditorialSequence(left) - getEditorialSequence(right);
    if (sequence !== 0) return sequence;
    return left.title.localeCompare(right.title, "es", { numeric: true, sensitivity: "base" });
  });
}
