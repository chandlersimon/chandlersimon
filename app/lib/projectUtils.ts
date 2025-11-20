import { Project } from '@/types';

export function slugify(value: string = ''): string {
  return value
    .toLowerCase()
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function titleize(value: string = ''): string {
  const words = value.split('-').filter(Boolean);
  if (!words.length) return 'Untitled Project';
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

export function parseDetailSections(input: string = '') {
  if (typeof input !== 'string' || !input.includes('*')) return [];
  const tokens = input.split('*');
  const sections = [];
  for (let index = 1; index < tokens.length; index += 2) {
    const label = tokens[index]?.trim();
    const value = tokens[index + 1]?.trim();
    if (!label) continue;
    sections.push({ label, value: formatDetailValue(value || '') });
  }
  return sections;
}

export function formatDetailValue(value: string = '') {
  if (typeof value !== 'string') return value;
  return value.replace(/,\s*/g, ',\n').trim();
}

export function normalizeProject(config: any, index: number): Project {
  const fallbackSlug = config.title ? slugify(config.title) : `project-${index + 1}`;
  const slug = config.slug ? slugify(config.slug) : fallbackSlug;
  const title = config.title || titleize(slug);
  const label = config.label || `(${String(index + 1).padStart(2, '0')})`;
  const gallery = Array.isArray(config.gallery) ? config.gallery : [];
  const sheetGallery = Array.isArray(config.sheetGallery) ? config.sheetGallery : [];
  
  // Find cover
  const firstImage = gallery.find((item: any) => item?.type === 'image');
  const firstVideoPoster = gallery.find((item: any) => item?.poster)?.poster;
  const cover = config.cover || firstImage?.src || firstVideoPoster || '';

  const detailText = typeof config.detailText === 'string' ? config.detailText : '';
  const detailSections = parseDetailSections(detailText);

  return {
    id: config.id || slug,
    slug,
    label,
    title,
    type: config.type || (gallery.find((item: any) => item?.type === 'video') ? 'video' : 'image'),
    cover,
    alt: config.alt || `${title} asset`,
    sheetTitle: config.sheetTitle || title,
    description: config.description || '',
    tags: Array.isArray(config.tags) ? config.tags : [],
    facts: Array.isArray(config.facts) ? config.facts : [],
    details: Array.isArray(config.details) ? config.details : [],
    detailText,
    detailSections,
    gallery,
    sheetGallery,
    span: config.span
  };
}
