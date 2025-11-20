'use client';

import { Project } from '@/types';
import { useEffect, useState, useRef } from 'react';
import ProjectContent from './ProjectContent';

interface ProjectSheetProps {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
  onClosed?: () => void;
}

export default function ProjectSheet({ project, isOpen, onClose, onClosed }: ProjectSheetProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (isOpen) {
      setIsVisible(true);
      
      // Delay the slide-up animation to allow the background scale effect to be seen first
      timer = setTimeout(() => {
        requestAnimationFrame(() => {
          setIsActive(true);
        });
      }, 100);
    } else {
      setIsActive(false);
      
      timer = setTimeout(() => {
        setIsVisible(false);
        if (onClosed) onClosed();
      }, 360);
    }

    return () => clearTimeout(timer);
  }, [isOpen, onClosed]);

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
            <button className="project-sheet__close" type="button" aria-label="Close project" onClick={onClose} style={{ zIndex: 50 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M24 3.32784L15.3278 12L24 20.6722L20.6722 24L12 15.3278L3.32784 24L0 20.6722L8.67216 12L0 3.32784L3.32784 0L12 8.67216L20.6722 0L24 3.32784Z" fill="black"/>
              </svg>
            </button>
            <ProjectContent project={displayProject} />
        </div>
    </div>
  );
}
