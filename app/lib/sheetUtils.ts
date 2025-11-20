import { Asset } from '@/types';

const SHEET_PERCENTAGE_MIN = 1;
const SHEET_PERCENTAGE_MAX = 100;
const DEFAULT_SHEET_ROW_GAP = 10;

export const clampNumber = (value: number, min: number, max: number) => {
  if (!Number.isFinite(value)) return null;
  return Math.min(Math.max(value, min), max);
};

export const getAssetPrimaryUrl = (asset: Asset = {}) => {
  if (asset?.src) return asset.src;
  if (Array.isArray(asset?.sources)) {
    const source = asset.sources.find((entry) => entry?.src);
    if (source?.src) return source.src;
  }
  if (asset?.poster) return asset.poster;
  return '';
};

export const getFileStemFromUrl = (url = '') => {
  if (!url) return '';
  const sanitized = url.split('?')[0].split('#')[0];
  const fileName = sanitized.substring(sanitized.lastIndexOf('/') + 1);
  if (!fileName) return '';
  return fileName.replace(/\.[^/.]+$/, '');
};

export const getOrderIndex = (token = '') => {
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

export const parseSheetAssetLayoutFromUrl = (url = '') => {
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
    width: widthValue || undefined,
    orderKey: orderTokenNormalized || null,
    orderIndex: Number.isFinite(orderIndex) ? orderIndex : null,
    gap: DEFAULT_SHEET_ROW_GAP
  };
};

export const attachLayoutToAsset = (asset: Asset, overrides = {}) => {
  if (!asset) return asset;
  if (!asset.layout) {
    const url = getAssetPrimaryUrl(asset);
    if (url) {
      const layout = parseSheetAssetLayoutFromUrl(url);
      if (layout) {
        asset.layout = { ...layout, ...overrides } as any;
      }
    }
  }
  if (overrides && Object.keys(overrides).length) {
    asset.layout = { ...(asset.layout || {}), ...overrides };
  }
  return asset;
};

export const computeRowWidths = (rowAssets: Asset[] = []) => {
  if (!rowAssets.length) return [];
  const preliminary = rowAssets.map((asset) =>
    Number.isFinite(asset?.layout?.width) ? clampNumber(asset.layout!.width!, 1, 100) : null
  );
  const specifiedTotal = preliminary.reduce((sum, width) => sum! + (width ?? 0), 0);
  const unspecifiedCount = preliminary.filter((width) => width === null).length;

  if (unspecifiedCount > 0) {
    const remaining = Math.max(0, 100 - specifiedTotal!);
    const fallbackWidth = remaining > 0 ? remaining / unspecifiedCount : 100 / rowAssets.length;
    return preliminary.map((width) => (width === null ? fallbackWidth : width));
  }

  if (specifiedTotal! <= 0) {
    const evenWidth = 100 / rowAssets.length;
    return rowAssets.map(() => evenWidth);
  }

  return preliminary.map((width) => ((width ?? 0) / specifiedTotal!) * 100);
};

export const buildSheetRows = (assets: Asset[] = []) => {
  const rows: { assets: Asset[]; columns: number; gap: number; widths: (number | null)[] }[] = [];
  let cursor = 0;

  while (cursor < assets.length) {
    const asset = assets[cursor];
    const layout = asset?.layout;

    if (layout?.groupSize && layout.groupSize > 1) {
      const groupSize = Math.min(layout.groupSize, assets.length - cursor);
      if (groupSize <= 1) {
        rows.push({ assets: [asset], columns: 1, gap: 0, widths: [100] });
        cursor += 1;
        continue;
      }
      const groupAssets = assets.slice(cursor, cursor + groupSize);
      const sortedAssets = [...groupAssets].sort((a, b) => {
        const orderA = Number.isFinite(a?.layout?.orderIndex)
          ? a.layout!.orderIndex!
          : groupAssets.indexOf(a);
        const orderB = Number.isFinite(b?.layout?.orderIndex)
          ? b.layout!.orderIndex!
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
      const groupAssets: Asset[] = [];
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
            ? a.layout!.orderIndex!
            : groupAssets.indexOf(a);
          const orderB = Number.isFinite(b?.layout?.orderIndex)
            ? b.layout!.orderIndex!
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
