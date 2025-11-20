'use client';

import { Project, Asset } from '@/types';
import { useMemo, useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { attachLayoutToAsset, buildSheetRows } from '@/app/lib/sheetUtils';

interface ProjectContentProps {
  project: Project;
  isStandalone?: boolean;
}

export default function ProjectContent({ project, isStandalone = false }: ProjectContentProps) {
  const rows = useMemo(() => {
    if (!project) return [];
    const assets = project.sheetGallery || project.gallery || [];
    if (assets.length) {
      const decoratedAssets = assets.map((asset) => attachLayoutToAsset({ ...asset }));
      return buildSheetRows(decoratedAssets);
    }
    return [];
  }, [project]);

  const contentStyle = isStandalone ? {
    maxHeight: 'none',
    minHeight: 'auto',
    overflowY: 'visible' as const,
    height: 'auto'
  } : {};

  return (
    <div className="project-sheet__content" style={contentStyle}>
        <div className="project-sheet__meta">
            <div className="project-sheet__header">
                <p className="project-sheet__project-id">{project.label}</p>
                <h3 className="project-sheet__title">{project.description || project.sheetTitle}</h3>
            </div>
            <dl className="project-sheet__detail-grid">
                {project.detailSections?.map((section, i) => (
                    <div key={i} className="contents">
                        <dt>{section.label}</dt>
                        <dd>{renderDetailValue(section.value)}</dd>
                    </div>
                ))}
                {project.facts?.map((fact, i) => (
                    <div key={`fact-${i}`} className="contents">
                        <dt>{fact.label}</dt>
                        <dd>{renderDetailValue(fact.value)}</dd>
                    </div>
                ))}
            </dl>
        </div>
        <div className="project-sheet__gallery">
            {rows.length === 0 && (
                <p className="project-sheet__empty">More imagery coming soon.</p>
            )}
            {rows.map((row, rowIndex) => {
                const gapValue = Number.isFinite(row.gap) ? row.gap : 0;
                const columnCount = Math.max(1, row.columns || row.assets.length || 1);
                const gapTotal = gapValue * Math.max(0, columnCount - 1);
                
                return (
                    <div 
                        key={rowIndex} 
                        className="project-sheet__row"
                        data-columns={columnCount}
                        style={{
                            '--sheet-row-gap': `${gapValue}px`,
                            '--sheet-row-gap-total': `${gapTotal}px`
                        } as React.CSSProperties}
                    >
                        {row.assets.map((asset: Asset, colIndex: number) => {
                            const widthValue = row.widths?.[colIndex] ?? (100 / columnCount);
                            const aspectRatio = asset.aspectRatio || asset.layout?.aspectRatio || (4/3);
                            
                            return (
                                <SheetAsset 
                                    key={colIndex} 
                                    asset={asset} 
                                    widthValue={widthValue} 
                                    aspectRatio={aspectRatio} 
                                />
                            );
                        })}
                    </div>
                );
            })}
        </div>
    </div>
  );
}

const SheetAsset = ({ asset, widthValue, aspectRatio }: { asset: Asset, widthValue: number, aspectRatio: number }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && videoRef.current.readyState >= 3) {
      setIsLoaded(true);
    }
  }, []);

  return (
    <figure 
        className={`project-sheet__figure ${!isLoaded ? 'is-loading' : ''}`}
        style={{
            '--sheet-asset-width': String(widthValue),
            '--sheet-asset-aspect': String(aspectRatio)
        } as React.CSSProperties}
    >
        {asset.type === 'video' ? (
            <video
                ref={videoRef}
                src={asset.sources?.[0]?.src || asset.src}
                poster={asset.poster}
                autoPlay={asset.autoplay}
                loop={asset.loop}
                muted={asset.muted}
                playsInline
                controls={asset.controls}
                preload="auto"
                className="w-full h-full object-cover"
                onLoadedData={() => setIsLoaded(true)}
                onCanPlay={() => setIsLoaded(true)}
                onPlaying={() => setIsLoaded(true)}
            />
        ) : (
            <Image
                src={asset.src || ''}
                alt={asset.alt || ''}
                width={1200}
                height={900}
                className="w-full h-full object-cover"
                onLoad={() => setIsLoaded(true)}
                onError={() => setIsLoaded(true)}
            />
        )}
    </figure>
  );
};

const renderDetailValue = (value: string) => {
  const linkMatch = value.match(/^(.*)\((https?:[^)]+)\)\s*$/);
  if (linkMatch) {
    const [, textPart, url] = linkMatch;
    return (
      <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="text-link text-link--arrow"
      >
        <span className="text-link__label">{textPart.trim()}</span>
        <span className="text-link__arrow">↗</span>
      </a>
    );
  }
  return value;
};
