'use client';

import { useState, useEffect, useLayoutEffect } from 'react';
import { Project } from '@/types';
import Header from './components/Header';
import ProjectGrid from './components/ProjectGrid';
import AboutSection from './components/AboutSection';
import ProjectSheet from './components/ProjectSheet';

export default function ClientPage({ projects }: { projects: Project[] }) {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const handleProjectClick = (project: Project) => {
    setSelectedProject(project);
    setIsSheetOpen(true);
    window.history.pushState(null, '', `#${project.id}`);
  };

  const handleCloseSheet = () => {
    setIsSheetOpen(false);
    setTimeout(() => setSelectedProject(null), 300);
    window.history.pushState(null, '', ' ');
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash) {
        const project = projects.find(p => p.id === hash);
        if (project) {
          setSelectedProject(project);
          setIsSheetOpen(true);
        }
      } else {
        setIsSheetOpen(false);
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [projects]);

  useLayoutEffect(() => {
    const pageShell = document.querySelector('.page-shell') as HTMLElement;
    if (!pageShell) return;

    if (isSheetOpen) {
      const scrollY = window.scrollY;
      const originY = scrollY + window.innerHeight / 2;
      
      pageShell.style.setProperty('--page-scroll-offset', `${scrollY}px`);
      pageShell.style.setProperty('--scale-origin-y', `${originY}px`);
      pageShell.classList.add('page-shell--locked');
    } else {
      if (pageShell.classList.contains('page-shell--locked')) {
        const scrollY = parseInt(pageShell.style.getPropertyValue('--page-scroll-offset') || '0', 10);
        
        pageShell.classList.remove('page-shell--locked');
        document.body.classList.remove('sheet-open');
        
        document.documentElement.style.setProperty('scroll-behavior', 'auto', 'important');
        window.scrollTo({
          top: scrollY,
          behavior: 'instant'
        });

        setTimeout(() => {
          document.documentElement.style.removeProperty('scroll-behavior');
          pageShell.style.removeProperty('--page-scroll-offset');
          pageShell.style.removeProperty('--scale-origin-y');
        }, 300);
      }
    }
  }, [isSheetOpen]);

  return (
    <>
      <div className="page-shell">
        <Header />
        <main>
          <section className="projects" id="projects">
            <ProjectGrid projects={projects} onProjectClick={handleProjectClick} />
          </section>
          <AboutSection />
        </main>
      </div>
      <ProjectSheet 
        project={selectedProject} 
        isOpen={isSheetOpen} 
        onClose={handleCloseSheet} 
      />
    </>
  );
}
