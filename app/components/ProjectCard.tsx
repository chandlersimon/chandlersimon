'use client';

import { Project } from '@/types';
import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Image from 'next/image';
import Link from 'next/link';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

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

interface ProjectCardProps {
  project: Project;
  index: number;
  isSheetOpen?: boolean;
}

export default function ProjectCard({ project, index, isSheetOpen = false }: ProjectCardProps) {
  const cardRef = useRef<HTMLAnchorElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const pattern = GRID_PATTERN[index % GRID_PATTERN.length];
  const block = Math.floor(index / GRID_PATTERN.length);
  const rowShift = block * GRID_ROW_INCREMENT;
  const rowStart = pattern.rowStart + rowShift;
  const rowEnd = pattern.rowEnd + rowShift;
  
  const style = {
    gridArea: `${rowStart} / ${pattern.colStart} / ${rowEnd} / ${pattern.colEnd}`,
    alignSelf: (pattern as any).alignSelf,
    justifySelf: (pattern as any).justifySelf,
  } as React.CSSProperties;

  let marginClass = '';
  if (index < 2) {
    marginClass = MARGIN_VARIANTS[0];
  } else {
    const choiceIndex = (index * 7) % MARGIN_VARIANTS.length;
    marginClass = MARGIN_VARIANTS[choiceIndex];
  }

  // Check video ready state on mount
  useEffect(() => {
    if (videoRef.current && videoRef.current.readyState >= 3) {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    const media = mediaRef.current?.querySelector('img, video');
    if (!media) return;

    // If sheet is open, we don't want to run any scroll triggers or animations
    // We can revert any existing ones to ensure clean state
    if (isSheetOpen) {
        return;
    }

    const mm = gsap.matchMedia();
    
    mm.add("(min-width: 769px)", () => {
        // Check if element is in viewport
        const rect = mediaRef.current?.getBoundingClientRect();
        const isVisible = rect && (rect.top < window.innerHeight + 100) && (rect.bottom > -100);

        gsap.fromTo(media, 
            { scale: isVisible ? 1 : 0.4, filter: isVisible ? 'blur(0px)' : 'blur(100px)' },
            {
                scale: 1,
                filter: 'blur(0px)',
                ease: 'power3.out',
                scrollTrigger: {
                    trigger: mediaRef.current,
                    start: 'top bottom',
                    end: 'top 40%',
                    scrub: 0.6
                }
            }
        );
    });

    mm.add("(max-width: 768px)", () => {
        gsap.set(media, { clearProps: "scale,filter,transform" });
    });

    return () => {
      mm.revert();
    };
  }, [isSheetOpen]);

  return (
    <Link 
      href={`/project/${project.id}`}
      className={`project-card ${marginClass}`}
      style={style}
      ref={cardRef}
      scroll={false}
    >
      <div className={`overview ${!isLoaded ? 'is-loading' : ''}`} ref={mediaRef}>
         {project.type === 'video' ? (
             <video 
                ref={videoRef}
                src={project.cover} 
                autoPlay 
                muted 
                loop 
                playsInline 
                preload="auto"
                onCanPlay={() => setIsLoaded(true)}
                onLoadedData={() => setIsLoaded(true)}
                onPlaying={() => setIsLoaded(true)}
                className={`w-full h-full object-cover transition-opacity duration-150 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
                style={{ width: '100%', height: 'auto' }}
             />
         ) : (
             <Image 
                src={project.cover || ''} 
                alt={project.alt || ''} 
                width={0}
                height={0}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                onLoad={() => setIsLoaded(true)}
                className={`w-full h-full object-cover transition-opacity duration-150 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
                style={{ width: '100%', height: 'auto' }}
             />
         )}
      </div>
      <div className="project-card__meta">
        <span className="project-card__number">{project.label}</span>
        <p className="project-card__title">{project.title}</p>
      </div>
    </Link>
  );
}
