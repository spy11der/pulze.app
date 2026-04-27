export type ImageUseCase = 'hero' | 'card' | 'thumbnail' | 'detail' | 'square';

export interface EventImageLike {
  url: string;
  ratio?: string | null;
  width?: number | null;
  height?: number | null;
}

const RATIO_PREF: Record<ImageUseCase, string[]> = {
  hero: ['16_9', '3_2', '4_3', 'custom'],
  card: ['4_3', '3_2', '16_9', 'custom'],
  thumbnail: ['4_3', '3_2', '16_9', 'custom'],
  detail: ['3_2', '16_9', '4_3', 'custom'],
  square: ['1_1', '4_3', '16_9', 'custom'],
};

const MIN_WIDTH: Record<ImageUseCase, number> = {
  hero: 800,
  card: 280,
  thumbnail: 200,
  detail: 600,
  square: 300,
};

export function pickBestImage(
  images: EventImageLike[] | null | undefined,
  useCase: ImageUseCase = 'card',
): string | null {
  if (!images || images.length === 0) return null;

  const minWidth = MIN_WIDTH[useCase];
  const ratios = RATIO_PREF[useCase];

  for (const ratio of ratios) {
    const matches = images
      .filter((img) => img.ratio === ratio && (img.width ?? 0) >= minWidth)
      .sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
    if (matches[0]?.url) return matches[0].url;
  }

  for (const ratio of ratios) {
    const matches = images
      .filter((img) => img.ratio === ratio)
      .sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
    if (matches[0]?.url) return matches[0].url;
  }

  const sorted = [...images].sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
  return sorted[0]?.url ?? null;
}

export function pickImagesGallery(images: EventImageLike[] | null | undefined): string[] {
  if (!images || images.length === 0) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  const sorted = [...images].sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
  for (const img of sorted) {
    if (!seen.has(img.url)) {
      seen.add(img.url);
      out.push(img.url);
    }
  }
  return out;
}
