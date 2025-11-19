#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';

const ROOT_DIR = process.cwd();
const PROJECTS_JSON_PATH = path.join(ROOT_DIR, 'content/projects/projects.json');
const SUPPORTED_IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif']);
const SUPPORTED_VIDEO_EXTENSIONS = new Set(['mp4', 'mov', 'm4v']);

const readUInt16LE = (buffer, offset) => buffer.readUInt16LE(offset);
const readUInt16BE = (buffer, offset) => buffer.readUInt16BE(offset);
const readUInt32BE = (buffer, offset) => buffer.readUInt32BE(offset);
const readUInt64BE = (buffer, offset) => {
  const high = buffer.readUInt32BE(offset);
  const low = buffer.readUInt32BE(offset + 4);
  return high * 0x100000000 + low;
};

const extractPngDimensions = (buffer) => {
  // PNG signature (8 bytes) + length (4) + chunk type (4) + IHDR payload
  if (buffer.length < 24) return null;
  const signature = buffer.slice(0, 8).toString('hex');
  if (signature !== '89504e470d0a1a0a') return null;
  const chunkType = buffer.slice(12, 16).toString('ascii');
  if (chunkType !== 'IHDR') return null;
  const width = readUInt32BE(buffer, 16);
  const height = readUInt32BE(buffer, 20);
  return { width, height };
};

const SOF_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf
]);

const extractJpegDimensions = (buffer) => {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    let marker = buffer[offset + 1];
    while (marker === 0xff) {
      offset += 1;
      marker = buffer[offset + 1];
    }
    if (marker === 0xd9 || marker === 0xda) break;
    const length = readUInt16BE(buffer, offset + 2);
    if (SOF_MARKERS.has(marker)) {
      if (offset + 7 >= buffer.length) return null;
      const height = readUInt16BE(buffer, offset + 5);
      const width = readUInt16BE(buffer, offset + 7);
      return { width, height };
    }
    offset += 2 + length;
  }
  return null;
};

const extractGifDimensions = (buffer) => {
  if (buffer.length < 10) return null;
  const header = buffer.slice(0, 6).toString('ascii');
  if (header !== 'GIF87a' && header !== 'GIF89a') return null;
  const width = readUInt16LE(buffer, 6);
  const height = readUInt16LE(buffer, 8);
  return { width, height };
};

const getImageDimensions = (buffer, extension) => {
  switch (extension) {
    case 'png':
      return extractPngDimensions(buffer);
    case 'jpg':
    case 'jpeg':
      return extractJpegDimensions(buffer);
    case 'gif':
      return extractGifDimensions(buffer);
    default:
      return null;
  }
};

const parseTrackHeaderDimensions = (buffer) => {
  if (!buffer?.length) return null;
  const version = buffer[0];
  let offset = 4; // version + flags
  if (version === 0) {
    offset += 4 + 4; // creation + modification
    offset += 4; // track id
    offset += 4; // reserved
    offset += 4; // duration
  } else if (version === 1) {
    offset += 8 + 8; // creation + modification (64-bit)
    offset += 4; // track id
    offset += 4; // reserved
    offset += 8; // duration 64-bit
  } else {
    return null;
  }
  offset += 8; // reserved
  offset += 2 + 2 + 2 + 2; // layer + alternate + volume + reserved
  offset += 36; // matrix
  if (offset + 8 > buffer.length) {
    return null;
  }
  const widthFixed = readUInt32BE(buffer, offset);
  const heightFixed = readUInt32BE(buffer, offset + 4);
  const width = widthFixed / 65536;
  const height = heightFixed / 65536;
  if (width > 0 && height > 0) {
    return { width, height };
  }
  return null;
};

const MP4_CONTAINER_TYPES = new Set([
  'moov',
  'trak',
  'mdia',
  'minf',
  'stbl',
  'edts',
  'dinf',
  'udta',
  'meta',
  'mvex'
]);

const readMp4Boxes = (buffer, start = 0, end = buffer.length) => {
  let offset = start;
  const limit = Math.min(buffer.length, end);
  while (offset + 8 <= limit) {
    let size = readUInt32BE(buffer, offset);
    let headerSize = 8;
    if (size === 1) {
      if (offset + 16 > limit) break;
      size = readUInt64BE(buffer, offset + 8);
      headerSize = 16;
    } else if (size === 0) {
      size = limit - offset;
    }
    if (!Number.isFinite(size) || size <= 0) break;
    const boxEnd = offset + size;
    if (boxEnd > limit) break;
    const type = buffer.slice(offset + 4, offset + 8).toString('ascii');
    const dataStart = offset + headerSize;
    const dataEnd = boxEnd;

    if (type === 'tkhd') {
      const tkhdBuffer = buffer.slice(dataStart, dataEnd);
      const dims = parseTrackHeaderDimensions(tkhdBuffer);
      if (dims?.width && dims?.height) {
        return dims;
      }
    } else if (MP4_CONTAINER_TYPES.has(type)) {
      let innerStart = dataStart;
      if (type === 'meta' && innerStart + 4 <= dataEnd) {
        innerStart += 4; // skip version/flags for meta
      }
      const nested = readMp4Boxes(buffer, innerStart, dataEnd);
      if (nested) {
        return nested;
      }
    }

    offset = boxEnd;
  }
  return null;
};

const extractMp4Dimensions = (buffer) => readMp4Boxes(buffer);

const getVideoDimensions = (buffer, extension) => {
  switch (extension) {
    case 'mp4':
    case 'm4v':
    case 'mov':
      return extractMp4Dimensions(buffer);
    default:
      return null;
  }
};

const resolveAssetPath = (src = '') => {
  if (!src) return null;
  const normalized = src.startsWith('/') ? src.slice(1) : src;
  return path.resolve(ROOT_DIR, normalized);
};

const pruneLegacyDimensionFields = (asset = {}) => {
  if (!asset || typeof asset !== 'object') return;
  if ('width' in asset) {
    delete asset.width;
  }
  if ('height' in asset) {
    delete asset.height;
  }
};

const enrichImageAsset = async (asset) => {
  if (!asset || asset.type !== 'image' || !asset.src) {
    pruneLegacyDimensionFields(asset);
    return;
  }
  const extension = path.extname(asset.src).toLowerCase().replace('.', '');
  if (!SUPPORTED_IMAGE_EXTENSIONS.has(extension)) return;
  const absolutePath = resolveAssetPath(asset.src);
  if (!absolutePath) return;
  try {
    const buffer = await fs.readFile(absolutePath);
    const dimensions = getImageDimensions(buffer, extension);
    if (!dimensions || !dimensions.width || !dimensions.height) {
      pruneLegacyDimensionFields(asset);
      return;
    }
    const aspectRatio = dimensions.width / dimensions.height;
    if (Number.isFinite(aspectRatio)) {
      asset.aspectRatio = Number(aspectRatio.toFixed(6));
    }
    pruneLegacyDimensionFields(asset);
  } catch (error) {
    console.warn(`Unable to read dimensions for ${asset.src}: ${error.message}`);
    pruneLegacyDimensionFields(asset);
  }
};

const enrichVideoAsset = async (asset) => {
  if (!asset || asset.type !== 'video' || !Array.isArray(asset.sources)) {
    return;
  }
  const source = asset.sources.find((entry) => entry?.src);
  if (!source?.src) return;
  const extension = path.extname(source.src).toLowerCase().replace('.', '');
  if (!SUPPORTED_VIDEO_EXTENSIONS.has(extension)) return;
  const absolutePath = resolveAssetPath(source.src);
  if (!absolutePath) return;
  try {
    const buffer = await fs.readFile(absolutePath);
    const dimensions = getVideoDimensions(buffer, extension);
    if (dimensions?.width && dimensions?.height) {
      const ratio = dimensions.width / dimensions.height;
      if (Number.isFinite(ratio) && ratio > 0) {
        asset.aspectRatio = Number(ratio.toFixed(6));
      }
    }
  } catch (error) {
    console.warn(`Unable to read video dimensions for ${source.src}: ${error.message}`);
  }
};

const enrichProject = async (project) => {
  if (!project) return;
  const workQueue = [];
  if (Array.isArray(project.gallery)) {
    project.gallery.forEach((asset) => {
      workQueue.push(enrichImageAsset(asset));
      workQueue.push(enrichVideoAsset(asset));
    });
  }
  if (Array.isArray(project.sheetGallery)) {
    project.sheetGallery.forEach((asset) => {
      workQueue.push(enrichImageAsset(asset));
      workQueue.push(enrichVideoAsset(asset));
    });
  }
  await Promise.all(workQueue);
};

const run = async () => {
  const payload = JSON.parse(await fs.readFile(PROJECTS_JSON_PATH, 'utf8'));
  const projects = Array.isArray(payload?.projects) ? payload.projects : [];
  // Update metadata sequentially to avoid overwhelming the event loop
  for (const project of projects) {
    await enrichProject(project);
  }
  await fs.writeFile(PROJECTS_JSON_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`Updated asset metadata for ${projects.length} projects.`);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
