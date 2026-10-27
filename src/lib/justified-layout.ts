export type LayoutImage = { width: number; height: number };
export type LayoutRow = { indices: number[]; widths: number[]; height: number };

export function justifiedRows(images: LayoutImage[], containerWidth: number, targetHeight: number, gap = 8): LayoutRow[] {
  if (containerWidth <= 0 || !images.length) return [];
  const rows: LayoutRow[] = [];
  let indices: number[] = [];
  let ratioSum = 0;
  const ratio = (index: number) => Math.max(0.1, images[index].width / Math.max(1, images[index].height));
  const flush = (last: boolean) => {
    const available = Math.max(1, containerWidth - gap * (indices.length - 1));
    const height = last ? Math.min(targetHeight, available / ratioSum) : available / ratioSum;
    rows.push({ indices, widths: indices.map((index) => ratio(index) * height), height });
    indices = [];
    ratioSum = 0;
  };
  images.forEach((_, index) => {
    indices.push(index);
    ratioSum += ratio(index);
    if (ratioSum * targetHeight + gap * (indices.length - 1) >= containerWidth) flush(false);
  });
  if (indices.length) flush(true);
  return rows;
}
