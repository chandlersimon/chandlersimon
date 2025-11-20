import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import ffmpegPath from 'ffmpeg-static';
import { execFile } from 'child_process';
import util from 'util';

const execFilePromise = util.promisify(execFile);
const ASSETS_DIR = path.join(process.cwd(), 'public/assets');

async function compressVideo(filePath) {
  const tempPath = filePath + '.temp.mp4';
  try {
    console.log(`Optimizing video ${filePath}...`);
    // Using CRF 28 for good compression/quality balance, preset fast
    // -y to overwrite output
    await execFilePromise(ffmpegPath, [
      '-i', filePath,
      '-vcodec', 'libx264',
      '-crf', '28',
      '-preset', 'fast',
      '-acodec', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      '-y',
      tempPath
    ]);
    
    // Replace original with compressed version
    fs.unlinkSync(filePath);
    fs.renameSync(tempPath, filePath);
    console.log(`Optimized video ${filePath}`);
  } catch (err) {
    console.error(`Failed to optimize video ${filePath}:`, err);
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
  }
}

async function optimizeImages(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      await optimizeImages(filePath);
    } else {
      if (/\.(jpg|jpeg|png)$/i.test(file)) {
        console.log(`Optimizing image ${filePath}...`);
        try {
          const image = sharp(filePath);
          const metadata = await image.metadata();
          
          if (metadata.format === 'jpeg' || metadata.format === 'jpg') {
             const buffer = await image
              .resize(1920, null, { withoutEnlargement: true })
              .jpeg({ quality: 80, mozjpeg: true })
              .toBuffer();
             fs.writeFileSync(filePath, buffer);
             
             // Also create WebP version
             const webpBuffer = await image
              .resize(1920, null, { withoutEnlargement: true })
              .webp({ quality: 80 })
              .toBuffer();
             fs.writeFileSync(filePath.replace(/\.[^.]+$/, '.webp'), webpBuffer);
             
          } else if (metadata.format === 'png') {
             const buffer = await image
              .resize(1920, null, { withoutEnlargement: true })
              .png({ quality: 80, compressionLevel: 9 })
              .toBuffer();
             fs.writeFileSync(filePath, buffer);
             
             // Also create WebP version
             const webpBuffer = await image
              .resize(1920, null, { withoutEnlargement: true })
              .webp({ quality: 80 })
              .toBuffer();
             fs.writeFileSync(filePath.replace(/\.[^.]+$/, '.webp'), webpBuffer);
          }
        } catch (err) {
          console.error(`Failed to optimize image ${filePath}: `, err);
        }
      } else if (/\.(mp4|mov|m4v)$/i.test(file)) {
        await compressVideo(filePath);
      }
    }
  }
}

optimizeImages(ASSETS_DIR).then(() => console.log('Done')).catch(console.error);
