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
const DEFAULT_SHEET_ROW_GAP = 10;
const SHEET_PERCENTAGE_MIN = 1;
const SHEET_PERCENTAGE_MAX = 100;
const SHEET_PRELOAD_ASSET_LIMIT = 6;

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

const projectAssetPreloaders = new Map();
const projectPreloadTimers = new Map();

const buildCoverFallbackAssets = (project = {}) => {
  const cover = project.cover;
  if (!cover) return [];
  const normalized = cover.toLowerCase();
  if (normalized.match(/\.(mp4|mov|webm|m4v)$/)) {
    return [
      {
        type: 'video',
        autoplay: true,
        loop: true,
        muted: true,
        sources: [{ src: cover, type: 'video/mp4' }]
      }
    ];
  }
  return [
    {
      type: 'image',
      src: cover,
      alt: project.alt
    }
  ];
};

const getProjectSheetAssets = (project = {}) => {
  if (Array.isArray(project.sheetGallery) && project.sheetGallery.length) {
    return project.sheetGallery;
  }
  if (Array.isArray(project.gallery) && project.gallery.length) {
    return project.gallery;
  }
  return buildCoverFallbackAssets(project);
};

const preloadImageSource = (src) => {
  if (!src) return Promise.resolve();
  return new Promise((resolve) => {
    const img = new Image();
    const cleanup = () => {
      img.onload = null;
      img.onerror = null;
      resolve();
    };
    img.onload = cleanup;
    img.onerror = cleanup;
    img.src = src;
    if (img.complete) {
      cleanup();
    } else if (img.decode) {
      img
        .decode()
        .then(cleanup)
        .catch(cleanup);
    }
  });
};

const preloadProjectAssets = (project, { limit = SHEET_PRELOAD_ASSET_LIMIT } = {}) => {
  if (!project?.id) return Promise.resolve(project);
  if (projectAssetPreloaders.has(project.id)) {
    return projectAssetPreloaders.get(project.id);
  }
  if (projectPreloadTimers.has(project.id)) {
    clearTimeout(projectPreloadTimers.get(project.id));
    projectPreloadTimers.delete(project.id);
  }
  const assets = getProjectSheetAssets(project).slice(0, limit);
  const preloadPromises = assets
    .filter((asset) => asset?.type === 'image' && asset?.src)
    .map((asset) => preloadImageSource(asset.src));
  const preloadPromise = Promise.all(preloadPromises).then(() => project);
  projectAssetPreloaders.set(project.id, preloadPromise);
  return preloadPromise;
};

const scheduleProjectPreload = (project, delay = 120) => {
  if (!project?.id) return;
  if (projectAssetPreloaders.has(project.id) || projectPreloadTimers.has(project.id)) {
    return;
  }
  const timerId = window.setTimeout(() => {
    projectPreloadTimers.delete(project.id);
    preloadProjectAssets(project);
  }, delay);
  projectPreloadTimers.set(project.id, timerId);
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
    const card = createCard(project, index);
    const warmProjectAssets = () => scheduleProjectPreload(project);
    card.addEventListener('mouseenter', warmProjectAssets);
    card.addEventListener('focusin', warmProjectAssets);
    card.addEventListener('touchstart', warmProjectAssets, { passive: true });
    if (index < 2) {
      scheduleProjectPreload(project, index === 0 ? 0 : 80);
    }
    galleryGrid.appendChild(card);
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
  const assets = getProjectSheetAssets(project);

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
  preloadProjectAssets(project);
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
    projects = projectData;
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
