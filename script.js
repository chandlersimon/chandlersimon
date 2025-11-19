const PROJECTS_CONFIG_PATH = 'content/projects/projects.json';

const GRID_PATTERN = [
  { rowStart: 1, rowEnd: 2, colStart: 1, colEnd: 4 },
  { rowStart: 1, rowEnd: 2, colStart: 4, colEnd: 7 },
  { rowStart: 2, rowEnd: 4, colStart: 3, colEnd: 6 },
  { rowStart: 2, rowEnd: 3, colStart: 7, colEnd: 9 },
  { rowStart: 4, rowEnd: 5, colStart: 1, colEnd: 3 },
  { rowStart: 4, rowEnd: 5, colStart: 3, colEnd: 6 },
  { rowStart: 4, rowEnd: 5, colStart: 7, colEnd: 9 },
  { rowStart: 5, rowEnd: 6, colStart: 1, colEnd: 4 },
  { rowStart: 5, rowEnd: 7, colStart: 4, colEnd: 7 }
];
const GRID_ROW_INCREMENT = 6;
const MARGIN_VARIANTS = ['mt-variant-1', 'mt-variant-2', 'mt-variant-3', 'mt-variant-4', ''];
const CARD_SCALE_MIN = 0.4;
const CARD_BLUR_START = 100;
const PROJECT_ASSETS_BASE_PATH = 'assets/projects';
const VIDEO_EXTENSIONS = ['mp4', 'mov', 'webm', 'm4v'];
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'jpf', 'svg', 'heic', 'heif'];
const ASSET_EXTENSION_ORDER = [...VIDEO_EXTENSIONS, ...IMAGE_EXTENSIONS];
const ASSET_MIME_TYPES = {
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  m4v: 'video/mp4',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  jpf: 'image/jpx',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  svg: 'image/svg+xml',
  heic: 'image/heic',
  heif: 'image/heif'
};
const MAX_SHEET_ASSETS = 24;
const DEFAULT_SHEET_ROW_GAP = 10;
const SHEET_ORDER_TOKENS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const SHEET_PERCENTAGE_MIN = 1;
const SHEET_PERCENTAGE_MAX = 100;

const clampNumber = (value, min, max) => {
  if (!Number.isFinite(value)) return null;
  return Math.min(Math.max(value, min), max);
};

const getAssetPrimaryUrl = (asset = {}) => {
  if (asset?.src) return asset.src;
  if (Array.isArray(asset?.sources)) {
    const source = asset.sources.find((entry) => entry?.src);
    if (source?.src) return source.src;
  }
  if (asset?.poster) return asset.poster;
  return '';
};

const getFileStemFromUrl = (url = '') => {
  if (!url) return '';
  const sanitized = url.split('?')[0].split('#')[0];
  const fileName = sanitized.substring(sanitized.lastIndexOf('/') + 1);
  if (!fileName) return '';
  return fileName.replace(/\.[^/.]+$/, '');
};

const getOrderIndex = (token = '') => {
  if (!token) return null;
  if (/^\d+$/.test(token)) {
    const numericIndex = Number.parseInt(token, 10) - 1;
    return Number.isFinite(numericIndex) && numericIndex >= 0 ? numericIndex : null;
  }
  const normalized = token.replace(/[^a-z]/gi, '').toUpperCase();
  if (!normalized) return null;
  let index = 0;
  for (let i = 0; i < normalized.length; i += 1) {
    const charCode = normalized.charCodeAt(i);
    if (charCode < 65 || charCode > 90) {
      return null;
    }
    index = index * 26 + (charCode - 64);
  }
  return index - 1;
};

const parseDetailSections = (input = '') => {
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
};

const formatDetailValue = (value = '') => {
  if (typeof value !== 'string') return value;
  return value.replace(/,\s*/g, ',\n').trim();
};

const buildExternalLinkHtml = (text, href) => {
  const safeHref = href?.trim();
  const safeText = text?.trim() || safeHref;
  if (!safeHref || !safeText) return safeText || '';
  return `<a class="text-link text-link--arrow" href="${safeHref}" target="_blank" rel="noopener noreferrer"><span class="text-link__label">${safeText}</span><span class="text-link__arrow" aria-hidden="true">↗</span></a>`;
};

const renderDetailValue = (value = '') => {
  if (typeof value !== 'string') return value;
  const linkMatch = value.match(/^(.*)\((https?:[^)]+)\)\s*$/);
  if (linkMatch) {
    const [, textPart, url] = linkMatch;
    return buildExternalLinkHtml(textPart || url, url);
  }
  return value;
};

const parseSheetAssetLayoutFromUrl = (url = '') => {
  const stem = getFileStemFromUrl(url);
  if (!stem) return null;
  const segments = stem.split('_').filter(Boolean);
  if (segments.length < 3) return null;
  const [sequenceToken, widthToken, orderToken] = segments;
  const widthValue = clampNumber(Number.parseInt(widthToken, 10), SHEET_PERCENTAGE_MIN, SHEET_PERCENTAGE_MAX);
  if (!Number.isFinite(widthValue)) {
    return null;
  }
  const orderTokenNormalized = orderToken?.trim()?.toUpperCase();
  const orderIndex = getOrderIndex(orderTokenNormalized);
  return {
    groupId: sequenceToken || null,
    width: widthValue,
    orderKey: orderTokenNormalized || null,
    orderIndex: Number.isFinite(orderIndex) ? orderIndex : null,
    gap: DEFAULT_SHEET_ROW_GAP
  };
};

const attachLayoutToAsset = (asset, overrides = {}) => {
  if (!asset) return asset;
  if (!asset.layout) {
    const url = getAssetPrimaryUrl(asset);
    if (url) {
      const layout = parseSheetAssetLayoutFromUrl(url);
      if (layout) {
        asset.layout = layout;
      }
    }
  }
  if (overrides && Object.keys(overrides).length) {
    asset.layout = { ...(asset.layout || {}), ...overrides };
  }
  return asset;
};

const computeRowWidths = (rowAssets = []) => {
  if (!rowAssets.length) return [];
  const preliminary = rowAssets.map((asset) =>
    Number.isFinite(asset?.layout?.width) ? clampNumber(asset.layout.width, 1, 100) : null
  );
  const specifiedTotal = preliminary.reduce((sum, width) => sum + (width ?? 0), 0);
  const unspecifiedCount = preliminary.filter((width) => width === null).length;

  if (unspecifiedCount > 0) {
    const remaining = Math.max(0, 100 - specifiedTotal);
    const fallbackWidth = remaining > 0 ? remaining / unspecifiedCount : 100 / rowAssets.length;
    return preliminary.map((width) => (width === null ? fallbackWidth : width));
  }

  if (specifiedTotal <= 0) {
    const evenWidth = 100 / rowAssets.length;
    return rowAssets.map(() => evenWidth);
  }

  return preliminary.map((width) => ((width ?? 0) / specifiedTotal) * 100);
};

const buildSheetRows = (assets = []) => {
  const rows = [];
  let cursor = 0;

  while (cursor < assets.length) {
    const asset = assets[cursor];
    const layout = asset?.layout;

    if (layout?.groupSize > 1) {
      const groupSize = Math.min(layout.groupSize, assets.length - cursor);
      if (groupSize <= 1) {
        rows.push({ assets: [asset], columns: 1, gap: 0, widths: [100] });
        cursor += 1;
        continue;
      }
      const groupAssets = assets.slice(cursor, cursor + groupSize);
      const sortedAssets = [...groupAssets].sort((a, b) => {
        const orderA = Number.isFinite(a?.layout?.orderIndex)
          ? a.layout.orderIndex
          : groupAssets.indexOf(a);
        const orderB = Number.isFinite(b?.layout?.orderIndex)
          ? b.layout.orderIndex
          : groupAssets.indexOf(b);
        if (orderA === orderB) return 0;
        return orderA - orderB;
      });
      rows.push({
        assets: sortedAssets,
        columns: sortedAssets.length,
        gap: layout.gap ?? DEFAULT_SHEET_ROW_GAP,
        widths: computeRowWidths(sortedAssets)
      });
      cursor += groupAssets.length;
      continue;
    }

    if (layout?.groupId) {
      const groupId = layout.groupId;
      const groupAssets = [];
      let lookAheadIndex = cursor;
      while (lookAheadIndex < assets.length) {
        const candidate = assets[lookAheadIndex];
        if (candidate?.layout?.groupId !== groupId) {
          break;
        }
        groupAssets.push(candidate);
        lookAheadIndex += 1;
      }
      if (groupAssets.length) {
        const sortedAssets = [...groupAssets].sort((a, b) => {
          const orderA = Number.isFinite(a?.layout?.orderIndex)
            ? a.layout.orderIndex
            : groupAssets.indexOf(a);
          const orderB = Number.isFinite(b?.layout?.orderIndex)
            ? b.layout.orderIndex
            : groupAssets.indexOf(b);
          if (orderA === orderB) return 0;
          return orderA - orderB;
        });
        rows.push({
          assets: sortedAssets,
          columns: sortedAssets.length,
          gap: layout.gap ?? DEFAULT_SHEET_ROW_GAP,
          widths: computeRowWidths(sortedAssets)
        });
        cursor = lookAheadIndex;
        continue;
      }
    }

    rows.push({ assets: [asset], columns: 1, gap: 0, widths: [100] });
    cursor += 1;
  }

  return rows;
};

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const galleryGrid = document.querySelector('#galleryGrid');
const pageShell = document.querySelector('.page-shell');
const sheet = document.querySelector('[data-sheet]');
const sheetTitle = sheet.querySelector('[data-sheet-title]');
const sheetProjectId = sheet.querySelector('[data-sheet-project-id]');
const sheetDetailGrid = sheet.querySelector('[data-sheet-detail-grid]');
const sheetGallery = sheet.querySelector('[data-sheet-gallery]');
const sheetContent = sheet.querySelector('.project-sheet__content');
const documentRoot = document.documentElement;

let projects = [];
let gsapEffectsInitialized = false;
let sheetHideTimeout;
let lockedScrollY = 0;
const debounce = (fn, wait = 200) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(null, args), wait);
  };
};

const slugify = (value = '') =>
  value
    .toLowerCase()
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const titleize = (value = '') => {
  const words = value.split('-').filter(Boolean);
  if (!words.length) return 'Untitled Project';
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const isVideoExtension = (extension = '') => VIDEO_EXTENSIONS.includes(extension.toLowerCase());
const getAssetMimeType = (extension = '') => ASSET_MIME_TYPES[extension.toLowerCase()] || '';

const doesAssetExist = async (url) => {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.warn(`Unable to verify asset at ${url}`, error);
    return false;
  }
};

const resetSheetScrollPosition = () => {
  if (!sheetContent) return;
  const previousBehavior = sheetContent.style.scrollBehavior || '';
  sheetContent.style.scrollBehavior = 'auto';
  sheetContent.scrollTop = 0;
  sheetContent.scrollLeft = 0;
  if (typeof sheetContent.scrollTo === 'function') {
    sheetContent.scrollTo(0, 0);
  }
  sheetContent.style.scrollBehavior = previousBehavior;
};

const formatProjectIdentifier = (project = {}) => {
  const rawLabel = project.label || '';
  const cleanedLabel = rawLabel.replace(/[()]/g, '').trim();
  if (cleanedLabel && project.sheetTitle) {
    return `${cleanedLabel}: ${project.sheetTitle}`;
  }
  return cleanedLabel || project.sheetTitle || '';
};

const normalizeDirectoryEntryName = (entry = '') => {
  if (!entry) return '';
  let sanitized = entry.trim();
  if (!sanitized || sanitized === '.' || sanitized === '../') return '';
  const hashIndex = sanitized.indexOf('#');
  if (hashIndex >= 0) {
    sanitized = sanitized.slice(0, hashIndex);
  }
  const queryIndex = sanitized.indexOf('?');
  if (queryIndex >= 0) {
    sanitized = sanitized.slice(0, queryIndex);
  }
  sanitized = sanitized.replace(/^\.\//, '').replace(/\/+/g, '/');
  if (!sanitized) return '';
  const segments = sanitized.split('/').filter(Boolean);
  if (!segments.length) return '';
  const tail = segments[segments.length - 1];
  if (!tail || tail === '..') return '';
  return tail;
};

const parseDirectoryListingPayload = (payload = '', contentType = '') => {
  if (!payload) return [];
  const entries = [];
  const trimmedContentType = contentType.toLowerCase();
  if (trimmedContentType.includes('application/json')) {
    try {
      const json = JSON.parse(payload);
      if (Array.isArray(json)) {
        return json.map((value) => (typeof value === 'string' ? value : '')).filter(Boolean);
      }
      if (Array.isArray(json?.files)) {
        return json.files
          .map((value) => (typeof value === 'string' ? value : ''))
          .filter(Boolean);
      }
    } catch (error) {
      // ignore malformed JSON
    }
  }

  if (trimmedContentType.includes('text/html') && typeof DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(payload, 'text/html');
      doc.querySelectorAll('a[href]').forEach((link) => {
        const href = link.getAttribute('href') || '';
        const normalized = normalizeDirectoryEntryName(href);
        if (normalized) {
          entries.push(normalized);
        }
      });
      if (entries.length) {
        return entries;
      }
    } catch (error) {
      // ignore DOM parse failures
    }
  }

  return payload
    .split(/\r?\n/)
    .map((line) => normalizeDirectoryEntryName(line))
    .filter(Boolean);
};

const fetchSheetAssetManifestEntries = async (directoryUrl) => {
  try {
    const manifestUrl = `${directoryUrl}manifest.json`;
    const response = await fetch(manifestUrl, { cache: 'no-store' });
    if (!response.ok) {
      return [];
    }
    const payload = await response.text();
    return parseDirectoryListingPayload(payload, response.headers.get('content-type') || '');
  } catch (error) {
    return [];
  }
};

const fetchSheetAssetDirectoryListing = async (directoryUrl) => {
  try {
    const response = await fetch(directoryUrl, { cache: 'no-store' });
    if (!response.ok) {
      return [];
    }
    const payload = await response.text();
    return parseDirectoryListingPayload(payload, response.headers.get('content-type') || '');
  } catch (error) {
    return [];
  }
};

const fetchSheetAssetFileMap = async (slug) => {
  const fileMap = new Map();
  if (!slug) return fileMap;
  const directoryUrl = `${PROJECT_ASSETS_BASE_PATH}/${slug}/sheet-assets/`;
  const entries = await fetchSheetAssetDirectoryListing(directoryUrl);
  entries.forEach((rawEntry) => {
    const normalized = normalizeDirectoryEntryName(rawEntry);
    if (!normalized || normalized.endsWith('/')) {
      return;
    }
    const extensionMatch = normalized.match(/\.([^./]+)$/);
    const extension = extensionMatch ? extensionMatch[1].toLowerCase() : '';
    if (!extension || !ASSET_EXTENSION_ORDER.includes(extension)) {
      return;
    }
    const stem = getFileStemFromUrl(normalized);
    if (!stem || fileMap.has(stem)) {
      return;
    }
    fileMap.set(stem, {
      url: `${directoryUrl}${normalized}`,
      extension
    });
  });
  return fileMap;
};

const buildSheetAssetsFromFileMap = ({ title = '', fileMap }) => {
  if (!fileMap?.size) return [];
  const assets = [];
  const singleEntries = new Map();
  const groupEntries = new Map();

  fileMap.forEach((file, stem) => {
    if (/^\d+$/.test(stem)) {
      singleEntries.set(stem, file);
      return;
    }
    const groupMatch = stem.match(/^(\d+)_([0-9]+)_([a-z]+)$/i);
    if (!groupMatch) {
      return;
    }
    const [, groupId, widthToken, orderToken] = groupMatch;
    const widthValue = clampNumber(Number.parseInt(widthToken, 10), SHEET_PERCENTAGE_MIN, SHEET_PERCENTAGE_MAX);
    const orderKey = (orderToken || '').toUpperCase();
    const orderIndex = getOrderIndex(orderKey);
    const entry = {
      ...file,
      groupId,
      width: widthValue,
      orderKey,
      orderIndex
    };
    if (!groupEntries.has(groupId)) {
      groupEntries.set(groupId, []);
    }
    groupEntries.get(groupId).push(entry);
  });

  for (let index = 1; index <= MAX_SHEET_ASSETS; index += 1) {
    if (assets.length >= MAX_SHEET_ASSETS) {
      break;
    }
    const groupId = String(index);
    if (singleEntries.has(groupId)) {
      const file = singleEntries.get(groupId);
      const descriptor = buildAssetDescriptor(
        file.url,
        file.extension,
        `${title} asset ${assets.length + 1}`.trim()
      );
      assets.push(attachLayoutToAsset(descriptor));
      continue;
    }
    if (groupEntries.has(groupId)) {
      const entries = groupEntries.get(groupId).sort((a, b) => {
        const orderA = Number.isFinite(a.orderIndex) ? a.orderIndex : 0;
        const orderB = Number.isFinite(b.orderIndex) ? b.orderIndex : 0;
        if (orderA === orderB) return 0;
        return orderA - orderB;
      });
      entries.forEach((entry, idx) => {
        if (assets.length >= MAX_SHEET_ASSETS) {
          return;
        }
        const descriptor = buildAssetDescriptor(
          entry.url,
          entry.extension,
          `${title} asset ${assets.length + 1}`.trim()
        );
        attachLayoutToAsset(descriptor, {
          groupId,
          width: entry.width,
          orderKey: entry.orderKey,
          orderIndex: Number.isFinite(entry.orderIndex) ? entry.orderIndex : idx,
          gap: DEFAULT_SHEET_ROW_GAP
        });
        assets.push(descriptor);
      });
      continue;
    }
    break;
  }

  return assets;
};

const collectSheetAssets = async (slug, title = '') => {
  if (!slug) {
    return [];
  }
  const fileMap = await fetchSheetAssetFileMap(slug);
  if (fileMap.size) {
    const mappedAssets = buildSheetAssetsFromFileMap({ title, fileMap });
    if (mappedAssets.length) {
      return mappedAssets.slice(0, MAX_SHEET_ASSETS);
    }
  }
  return collectSheetAssetsFallback(slug, title);
};

const findAssetByExtensions = async (basePath, extensions = ASSET_EXTENSION_ORDER) => {
  for (const extension of extensions) {
    const normalizedExtension = extension.toLowerCase();
    const candidate = `${basePath}.${normalizedExtension}`;
    const exists = await doesAssetExist(candidate);
    if (exists) {
      return { url: candidate, extension: normalizedExtension };
    }
  }
  return null;
};

const buildAssetDescriptor = (url, extension, altText = '') => {
  if (isVideoExtension(extension)) {
    return {
      type: 'video',
      autoplay: true,
      loop: true,
      muted: true,
      sources: [
        {
          src: url,
          type: getAssetMimeType(extension) || 'video/mp4'
        }
      ]
    };
  }
  return {
    type: 'image',
    src: url,
    alt: altText
  };
};

const buildSequentialGroupAsset = async ({ slug, index, orderToken }) => {
  const basePath = `${PROJECT_ASSETS_BASE_PATH}/${slug}/sheet-assets/${index}`;
  const orderVariants = [orderToken, orderToken.toLowerCase()];
  for (let width = SHEET_PERCENTAGE_MIN; width <= SHEET_PERCENTAGE_MAX; width += 1) {
    const widthTokens = [String(width)];
    if (width < 10) {
      widthTokens.push(`0${width}`);
    }
    for (const widthToken of widthTokens) {
      for (const token of orderVariants) {
        const candidate = await findAssetByExtensions(`${basePath}_${widthToken}_${token}`);
        if (candidate) {
          return { ...candidate, width: Number.parseInt(widthToken, 10) };
        }
      }
    }
  }
  return null;
};

const collectSequentialGroupAssetsFallback = async ({ slug, index, title = '', startIndex = 0 }) => {
  const groupedAssets = [];
  let accumulatedWidth = 0;
  for (const orderToken of SHEET_ORDER_TOKENS) {
    const candidate = await buildSequentialGroupAsset({ slug, index, orderToken });
    if (!candidate) {
      break;
    }

    const descriptor = buildAssetDescriptor(
      candidate.url,
      candidate.extension,
      `${title} asset ${startIndex + groupedAssets.length + 1}`.trim()
    );

    const widthValue = clampNumber(candidate.width, SHEET_PERCENTAGE_MIN, SHEET_PERCENTAGE_MAX);
    attachLayoutToAsset(descriptor, {
      groupId: String(index),
      width: widthValue,
      orderKey: orderToken,
      orderIndex: groupedAssets.length,
      gap: DEFAULT_SHEET_ROW_GAP
    });

    groupedAssets.push(descriptor);
    if (Number.isFinite(widthValue)) {
      accumulatedWidth += widthValue;
      if (accumulatedWidth >= 100) {
        break;
      }
    }
  }
  return groupedAssets;
};

const collectSheetAssetsFallback = async (slug, title = '') => {
  const assets = [];
  if (!slug) {
    return assets;
  }
  for (let index = 1; index <= MAX_SHEET_ASSETS; index += 1) {
    if (assets.length >= MAX_SHEET_ASSETS) {
      break;
    }
    const asset = await findAssetByExtensions(`${PROJECT_ASSETS_BASE_PATH}/${slug}/sheet-assets/${index}`);
    if (asset) {
      const descriptor = buildAssetDescriptor(
        asset.url,
        asset.extension,
        `${title} asset ${assets.length + 1}`.trim()
      );
      assets.push(attachLayoutToAsset(descriptor));
      continue;
    }

    const groupedAssets = await collectSequentialGroupAssetsFallback({
      slug,
      index,
      title,
      startIndex: assets.length
    });
    if (groupedAssets.length) {
      groupedAssets.forEach((descriptor) => {
        if (assets.length < MAX_SHEET_ASSETS) {
          assets.push(descriptor);
        }
      });
      continue;
    }

    break;
  }
  return assets;
};

const resolveProjectAssets = async (project) => {
  const enhancedProject = { ...project };
  const slug = enhancedProject.slug;
  if (!slug) {
    return enhancedProject;
  }

  try {
    const coverAsset = await findAssetByExtensions(`${PROJECT_ASSETS_BASE_PATH}/${slug}/cover`);
    if (coverAsset) {
      enhancedProject.cover = coverAsset.url;
      enhancedProject.type = isVideoExtension(coverAsset.extension) ? 'video' : 'image';
      if (!enhancedProject.gallery?.length) {
        enhancedProject.gallery = [buildAssetDescriptor(coverAsset.url, coverAsset.extension, enhancedProject.alt)];
      }
    }

    const sheetAssets = await collectSheetAssets(slug, enhancedProject.title);
    if (sheetAssets.length) {
      enhancedProject.sheetGallery = sheetAssets;
    }
  } catch (error) {
    console.warn(`Unable to load assets for ${slug}`, error);
  }

  return enhancedProject;
};

const normalizeProject = (config = {}, index = 0) => {
  const fallbackSlug = config.title ? slugify(config.title) : `project-${index + 1}`;
  const slug = config.slug ? slugify(config.slug) : fallbackSlug;
  const title = config.title || titleize(slug);
  const label = config.label || `(${String(index + 1).padStart(2, '0')})`;
  const gallery = Array.isArray(config.gallery) ? config.gallery : [];
  const sheetGallery = Array.isArray(config.sheetGallery) ? config.sheetGallery : [];
  const firstImage = gallery.find((item) => item?.type === 'image');
  const firstVideoPoster = gallery.find((item) => item?.poster)?.poster;
  const cover = config.cover || firstImage?.src || firstVideoPoster || '';
  const detailText = typeof config.detailText === 'string' ? config.detailText : '';
  const detailSections = parseDetailSections(detailText);
  const project = {
    id: slug,
    slug,
    fileName: slug,
    label,
    title,
    type: config.type || (gallery.find((item) => item?.type === 'video') ? 'video' : 'image'),
    span: config.span || '1x1',
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
    sheetGallery
  };

  return project;
};

const loadProjectsFromConfig = async () => {
  const response = await fetch(PROJECTS_CONFIG_PATH);
  if (!response.ok) {
    throw new Error(`Unable to read ${PROJECTS_CONFIG_PATH}`);
  }
  const payload = await response.json();
  const entries = Array.isArray(payload?.projects) ? payload.projects : [];
  return entries.map((entry, index) => normalizeProject(entry, index));
};

const galleryMessage = (text) => {
  const note = document.createElement('p');
  note.className = 'gallery-grid__message';
  note.textContent = text;
  galleryGrid.innerHTML = '';
  galleryGrid.appendChild(note);
};

const createVideoElement = (sources, poster, autoplay = true) => {
  const video = document.createElement('video');
  video.dataset.inlineVideo = 'true';
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  if (poster) video.poster = poster;
  if (!prefersReducedMotion.matches && autoplay) {
    video.autoplay = true;
  }
  sources.forEach((source) => {
    const sourceEl = document.createElement('source');
    sourceEl.src = source.src;
    if (source.type) sourceEl.type = source.type;
    video.appendChild(sourceEl);
  });
  if (prefersReducedMotion.matches) {
    video.removeAttribute('autoplay');
  }
  return video;
};

const applyGridPosition = (card, index) => {
  if (!GRID_PATTERN.length) return;
  const pattern = GRID_PATTERN[index % GRID_PATTERN.length];
  const block = Math.floor(index / GRID_PATTERN.length);
  const rowShift = block * GRID_ROW_INCREMENT;
  const rowStart = pattern.rowStart + rowShift;
  const rowEnd = pattern.rowEnd + rowShift;
  card.style.gridArea = `${rowStart} / ${pattern.colStart} / ${rowEnd} / ${pattern.colEnd}`;
  card.style.alignSelf = pattern.alignSelf ?? '';
  card.style.justifySelf = pattern.justifySelf ?? '';
};

const applyMarginVariant = (card, index) => {
  if (!MARGIN_VARIANTS.length) return;
  if (index < 2) {
    const pinned = MARGIN_VARIANTS[0];
    if (pinned) {
      card.classList.add(pinned);
    }
    return;
  }
  const choice = MARGIN_VARIANTS[Math.floor(Math.random() * MARGIN_VARIANTS.length)];
  if (choice) {
    card.classList.add(choice);
  }
};

const waitForMediaElements = (elements) => {
  if (!elements?.length) return Promise.resolve();

  const mediaPromises = elements.map((element) => {
    return new Promise((resolve) => {
      const tag = element.tagName?.toLowerCase();
      const cleanup = () => {
        element.removeEventListener('load', cleanup);
        element.removeEventListener('error', cleanup);
        element.removeEventListener('loadeddata', cleanup);
        resolve();
      };

      if (tag === 'video') {
        if (element.readyState >= 2) {
          resolve();
          return;
        }
        element.addEventListener('loadeddata', cleanup, { once: true });
        element.addEventListener('error', cleanup, { once: true });
      } else {
        if (element.complete) {
          resolve();
          return;
        }
        element.addEventListener('load', cleanup, { once: true });
        element.addEventListener('error', cleanup, { once: true });
      }
    });
  });

  return Promise.all(mediaPromises);
};

const setScrollTriggersEnabled = (enabled) => {
  const ScrollTrigger = window.ScrollTrigger;
  if (!ScrollTrigger) return;
  ScrollTrigger.getAll().forEach((trigger) => {
    if (enabled) {
      trigger.enable(false, true);
    } else {
      trigger.disable(false);
    }
  });
  if (enabled) {
    ScrollTrigger.refresh();
  }
};

const lockPageShell = () => {
  if (!pageShell) return;
  lockedScrollY = window.scrollY || document.documentElement.scrollTop || 0;
  const originY = lockedScrollY + window.innerHeight / 2;
  pageShell.style.setProperty('--page-scroll-offset', `${lockedScrollY}px`);
  pageShell.style.setProperty('--scale-origin-y', `${originY}px`);
  pageShell.classList.add('page-shell--locked');
};

const unlockPageShell = () => {
  if (!pageShell) return;
  pageShell.classList.remove('page-shell--locked');
  pageShell.style.removeProperty('--page-scroll-offset');
  pageShell.style.removeProperty('--scale-origin-y');
  const previousBehavior = documentRoot?.style?.scrollBehavior || '';
  if (documentRoot) {
    documentRoot.style.scrollBehavior = 'auto';
  }
  window.scrollTo(0, lockedScrollY);
  if (documentRoot) {
    documentRoot.style.scrollBehavior = previousBehavior;
  }
};

const initGsapEffects = () => {
  if (gsapEffectsInitialized) return;
  const gsapGlobal = window?.gsap;
  if (!gsapGlobal) {
    console.warn('[GSAP] not found — skipping hover/scroll effects.');
    return;
  }
  const ScrollTrigger = window.ScrollTrigger;
  if (ScrollTrigger) {
    gsapGlobal.registerPlugin(ScrollTrigger);
    ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
  } else {
    console.warn('[ScrollTrigger] not found — scroll effects limited.');
  }
  gsapGlobal.killTweensOf('.project-card .overview img, .project-card .overview video');
  gsapGlobal.killTweensOf('.about-grid__portrait img');

  const cardOverviews = Array.from(document.querySelectorAll('.project-card .overview'));
  if (!cardOverviews.length) return;
  cardOverviews.forEach((overview) => {
    const media = overview.querySelector('img, video') || overview;
    const cardElement = overview.closest('.project-card');
    const startValue = 'top bottom';
    const endValue = 'top 40%';
    gsapGlobal.set(media, { scale: CARD_SCALE_MIN, filter: `blur(${CARD_BLUR_START}px)` });

    if (ScrollTrigger) {
      gsapGlobal.fromTo(
        media,
        { scale: CARD_SCALE_MIN, filter: `blur(${CARD_BLUR_START}px)` },
        {
          scale: 1,
          filter: 'blur(0px)',
          ease: 'power3.out',
          scrollTrigger: {
            trigger: overview,
            start: startValue,
            end: endValue,
            scrub: 0.6
          }
        }
      );
      } else {
        gsapGlobal.fromTo(
          media,
          { scale: CARD_SCALE_MIN, filter: `blur(${CARD_BLUR_START}px)` },
        {
          scale: 1,
          filter: 'blur(0px)',
          ease: 'power3.out',
          duration: 0.9
        }
      );
    }
    });

  if (ScrollTrigger) {
    ScrollTrigger.refresh();
  }

  gsapEffectsInitialized = true;
};


const createCard = (project, index) => {
  const card = document.createElement('a');
  card.href = `#${project.id}`;
  card.className = 'project-card';
  card.dataset.projectId = project.id;
  card.dataset.span = project.span || '1x1';

  const overview = document.createElement('div');
  overview.className = 'overview';

  const primaryMedia = project.gallery?.[0];

  const appendMedia = (media) => {
    if (!media) return false;
    if (media.type === 'video' && Array.isArray(media.sources) && media.sources.length) {
      const video = createVideoElement(media.sources, media.poster);
      overview.appendChild(video);
      return true;
    }
    if (media.type === 'image' && media.src) {
      const img = document.createElement('img');
      img.src = media.src;
      img.alt = media.alt || project.alt;
      overview.appendChild(img);
      return true;
    }
    return false;
  };

  if (!appendMedia(primaryMedia)) {
    if (project.cover && project.cover.toLowerCase().match(/\\.(mp4|mov|webm|m4v)$/)) {
      const fallbackVideo = createVideoElement([{ src: project.cover, type: 'video/mp4' }], null);
      overview.appendChild(fallbackVideo);
    } else {
      const img = document.createElement('img');
      img.src = project.cover;
      img.alt = project.alt;
      overview.appendChild(img);
    }
  }

  const meta = document.createElement('div');
  meta.className = 'project-card__meta';

  const title = document.createElement('p');
  title.className = 'project-card__title';
  title.textContent = project.title;

  const number = document.createElement('span');
  number.className = 'project-card__number';
  number.textContent = project.label || `(${String(index + 1).padStart(2, '0')})`;

  meta.append(number, title);

  card.append(overview, meta);
  applyGridPosition(card, index);
  applyMarginVariant(card, index);
  return card;
};

const updateInlineVideos = () => {
  document.querySelectorAll('video[data-inline-video]').forEach((video) => {
    if (prefersReducedMotion.matches) {
      video.pause();
      video.removeAttribute('autoplay');
    } else {
      video.autoplay = true;
      const playPromise = video.play();
      if (playPromise) {
        playPromise.catch(() => {});
      }
    }
  });
};

const renderGallery = () => {
  galleryGrid.innerHTML = '';
  projects.forEach((project, index) => {
    galleryGrid.appendChild(createCard(project, index));
  });
  updateInlineVideos();
  const mediaElements = Array.from(
    galleryGrid.querySelectorAll('.project-card img, .project-card video')
  );
  gsapEffectsInitialized = false;
  waitForMediaElements(mediaElements).then(() => {
    initGsapEffects();
  });
};

prefersReducedMotion.addEventListener('change', () => updateInlineVideos());

const fillSheet = (project) => {
  if (sheetProjectId) {
    const identifier = formatProjectIdentifier(project);
    if (identifier) {
      sheetProjectId.textContent = identifier;
      sheetProjectId.removeAttribute('hidden');
    } else {
      sheetProjectId.setAttribute('hidden', '');
    }
  }

  if (sheetTitle) {
    sheetTitle.textContent = project.description || project.sheetTitle;
  }

  if (sheetDetailGrid) {
    const detailEntries = [];
    if (Array.isArray(project.detailSections) && project.detailSections.length) {
      detailEntries.push(
        ...project.detailSections.filter((entry) => entry?.label && entry?.value)
      );
    }
    const factEntries = Array.isArray(project.facts)
      ? project.facts.filter((fact) => fact?.label && fact?.value)
      : [];
    if (factEntries.length) {
      detailEntries.push(
        ...factEntries.map((fact) => ({ label: fact.label, value: formatDetailValue(fact.value) }))
      );
    }

    if (detailEntries.length) {
      sheetDetailGrid.innerHTML = detailEntries
        .map((entry) => `<dt>${entry.label}</dt><dd>${renderDetailValue(entry.value)}</dd>`)
        .join('');
      sheetDetailGrid.removeAttribute('hidden');
    } else {
      sheetDetailGrid.innerHTML = '';
      sheetDetailGrid.setAttribute('hidden', '');
    }
  }

  sheetGallery.innerHTML = '';
  const primaryGallery = project.sheetGallery?.length ? project.sheetGallery : project.gallery;
  const assets =
    primaryGallery?.length && Array.isArray(primaryGallery)
      ? primaryGallery
      : project.cover
      ? project.cover.toLowerCase().match(/\\.(mp4|mov|webm|m4v)$/)
        ? [{ type: 'video', sources: [{ src: project.cover, type: 'video/mp4' }] }]
        : [{ type: 'image', src: project.cover, alt: project.alt }]
      : [];

  if (!assets.length) {
    const empty = document.createElement('p');
    empty.className = 'project-sheet__empty';
    empty.textContent = 'More imagery coming soon.';
    sheetGallery.appendChild(empty);
    return;
  }

  const decoratedAssets = assets.map((asset) => attachLayoutToAsset(asset));
  const galleryRows = buildSheetRows(decoratedAssets);
  let assetSequence = 0;

  galleryRows.forEach((row) => {
    const rowElement = document.createElement('div');
    rowElement.className = 'project-sheet__row';
    const columnCount = Math.max(1, row.columns || row.assets.length || 1);
    const gapValue = Number.isFinite(row.gap) ? row.gap : 0;
    const gapTotal = gapValue * Math.max(0, columnCount - 1);
    rowElement.dataset.columns = String(columnCount);
    rowElement.style.setProperty('--sheet-row-gap', `${gapValue}px`);
    rowElement.style.setProperty('--sheet-row-gap-total', `${gapTotal}px`);

    row.assets.forEach((asset, columnIndex) => {
      const figure = document.createElement('figure');
      figure.className = 'project-sheet__figure';

      if (asset?.type === 'video' && Array.isArray(asset.sources)) {
        const video = document.createElement('video');
        const shouldAutoplay = Boolean(asset.autoplay);
        const shouldLoop = shouldAutoplay || Boolean(asset.loop);
        const controlsPreference =
          typeof asset.controls === 'boolean' ? asset.controls : !shouldAutoplay;

        video.playsInline = true;
        video.loop = shouldLoop;
        video.controls = controlsPreference;

        if (shouldAutoplay) {
          video.autoplay = true;
          video.muted = true;
        } else if (asset.muted) {
          video.muted = true;
        }

        if (asset.poster) {
          video.poster = asset.poster;
        }
        asset.sources.forEach((source) => {
          if (!source?.src) return;
          const sourceEl = document.createElement('source');
          sourceEl.src = source.src;
          if (source.type) sourceEl.type = source.type;
          video.appendChild(sourceEl);
        });
        figure.appendChild(video);
      } else if (asset?.src) {
        const img = document.createElement('img');
        img.src = asset.src;
        img.alt = asset.alt || `${project.title} asset ${assetSequence + 1}`;
        figure.appendChild(img);
      }

      const widthValue = clampNumber(row.widths?.[columnIndex], 1, 100);
      const normalizedWidth = widthValue ?? 100 / columnCount;
      figure.style.setProperty('--sheet-asset-width', String(normalizedWidth));

      rowElement.appendChild(figure);
      assetSequence += 1;
    });

    sheetGallery.appendChild(rowElement);
  });
};

const openProject = (project) => {
  fillSheet(project);
  resetSheetScrollPosition();
  if (sheetHideTimeout) {
    clearTimeout(sheetHideTimeout);
  }
  setScrollTriggersEnabled(false);
  lockPageShell();
  sheet.removeAttribute('hidden');
  sheet.dataset.open = 'false';
  // force reflow so animation runs consistently
  sheet.getBoundingClientRect();
  requestAnimationFrame(() => {
    resetSheetScrollPosition();
    sheet.dataset.open = 'true';
  });
  document.body.classList.add('sheet-open');
};

const closeProject = ({ updateHash = true } = {}) => {
  if (sheet.hasAttribute('hidden')) return;
  sheet.dataset.open = 'false';
  document.body.classList.remove('sheet-open');
  if (sheetHideTimeout) {
    clearTimeout(sheetHideTimeout);
  }
  sheetHideTimeout = window.setTimeout(() => {
    sheet.setAttribute('hidden', '');
    resetSheetScrollPosition();
    unlockPageShell();
    setScrollTriggersEnabled(true);
  }, 320);
  if (updateHash && window.location.hash) {
    history.replaceState(null, document.title, window.location.pathname + window.location.search);
  }
};

const renderProjectByHash = () => {
  const hash = window.location.hash.replace('#', '');
  if (!hash) {
    closeProject({ updateHash: false });
    return;
  }
  if (!projects.length) {
    return;
  }
  const project = projects.find((item) => item.id === hash);
  if (!project) {
    closeProject({ updateHash: false });
    return;
  }
  openProject(project);
};

window.addEventListener('hashchange', renderProjectByHash);
galleryGrid.addEventListener('click', (event) => {
  const card = event.target.closest('.project-card');
  if (!card) return;
  event.preventDefault();
  const { projectId } = card.dataset;
  if (!projectId) return;
  if (window.location.hash === `#${projectId}`) {
    renderProjectByHash();
  } else {
    window.location.hash = projectId;
  }
});

sheet.querySelectorAll('[data-sheet-dismiss]').forEach((trigger) => {
  trigger.addEventListener('click', () => {
    closeProject();
  });
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeProject();
  }
});

window.addEventListener(
  'resize',
  debounce(() => {
    if (!gsapEffectsInitialized) {
      initGsapEffects();
      return;
    }
    gsapEffectsInitialized = false;
    initGsapEffects();
  }, 250)
);

const init = async () => {
  window.scrollTo(0, 0);
  try {
    const projectData = await loadProjectsFromConfig();
    if (!projectData.length) {
      galleryMessage('Add entries to content/projects/projects.json to populate this grid.');
      return;
    }
    const resolvedProjects = await Promise.all(projectData.map((project) => resolveProjectAssets(project)));
    projects = resolvedProjects;
    renderGallery();
    renderProjectByHash();
  } catch (error) {
    console.error(error);
    galleryMessage('Unable to load content/projects/projects.json. Please ensure it exists and is valid JSON.');
  }
};

init();

window.addEventListener('load', () => {
  if (window.ScrollTrigger) {
    window.ScrollTrigger.refresh();
  }
});
