'use client';

import { Project, Asset } from '@/types';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { attachLayoutToAsset, buildSheetRows } from '@/app/lib/sheetUtils';

interface ProjectSheetProps {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
}

const SheetAsset = ({ asset, widthValue, aspectRatio }: { asset: Asset, widthValue: number, aspectRatio: number }) => {
  const [isLoaded, setIsLoaded] = useState(false);

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
                src={asset.sources?.[0]?.src || asset.src}
                poster={asset.poster}
                autoPlay={asset.autoplay}
                loop={asset.loop}
                muted={asset.muted}
                playsInline
                controls={asset.controls}
                className="w-full h-full object-cover"
                onLoadedData={() => setIsLoaded(true)}
            />
        ) : (
            <Image
                src={asset.src || ''}
                alt={asset.alt || ''}
                width={1200}
                height={900}
                className="w-full h-full object-cover"
                onLoad={() => setIsLoaded(true)}
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

export default function ProjectSheet({ project, isOpen, onClose }: ProjectSheetProps) {
  const [rows, setRows] = useState<any[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (project) {
      const assets = project.sheetGallery || project.gallery || [];
      if (assets.length) {
        const decoratedAssets = assets.map((asset) => attachLayoutToAsset({ ...asset }));
        const galleryRows = buildSheetRows(decoratedAssets);
        setRows(galleryRows);
      } else {
        setRows([]);
      }
    }
  }, [project]);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      document.body.classList.add('sheet-open');
      
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsActive(true);
        });
      });
    } else {
      setIsActive(false);
      document.body.classList.remove('sheet-open');
      
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 360);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!project && !isVisible) return null;
  
  const displayProject = project;
  if (!displayProject) return null;

  return (
    <div 
      className={`project-sheet ${isActive ? 'open' : ''}`} 
      data-open={isActive} 
      style={{ display: isVisible ? 'flex' : 'none' }}
    >
        <div className="project-sheet__backdrop" onClick={onClose}></div>
        <div className="project-sheet__panel" role="dialog" aria-modal="true">
            <button className="project-sheet__close" type="button" aria-label="Close project" onClick={onClose}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M24 3.32784L15.3278 12L24 20.6722L20.6722 24L12 15.3278L3.32784 24L0 20.6722L8.67216 12L0 3.32784L3.32784 0L12 8.67216L20.6722 0L24 3.32784Z" fill="black"/>
              </svg>
            </button>
            <div className="project-sheet__content">
                <div className="project-sheet__meta">
                    <div className="project-sheet__header">
                        <p className="project-sheet__project-id">{displayProject.label}</p>
                        <h3 className="project-sheet__title">{displayProject.description || displayProject.sheetTitle}</h3>
                    </div>
                    <dl className="project-sheet__detail-grid">
                        {displayProject.detailSections?.map((section, i) => (
                            <div key={i} className="contents">
                                <dt>{section.label}</dt>
                                <dd>{renderDetailValue(section.value)}</dd>
                            </div>
                        ))}
                        {displayProject.facts?.map((fact, i) => (
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
        </div>
    </div>
  );
}
