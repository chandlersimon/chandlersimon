export interface Asset {
  type?: 'image' | 'video';
  src?: string;
  poster?: string;
  alt?: string;
  sources?: { src: string; type: string }[];
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  controls?: boolean;
  preload?: string;
  aspectRatio?: number;
  layout?: {
    width?: number;
    groupId?: string;
    groupSize?: number;
    orderIndex?: number;
    gap?: number;
    aspectRatio?: number;
  };
}

export interface Project {
  id: string;
  slug: string;
  title: string;
  label?: string;
  type?: string;
  span?: string;
  cover?: string;
  alt?: string;
  sheetTitle?: string;
  description?: string;
  tags?: string[];
  facts?: { label: string; value: string }[];
  details?: any[];
  detailText?: string;
  detailSections?: { label: string; value: string }[];
  gallery?: Asset[];
  sheetGallery?: Asset[];
}
