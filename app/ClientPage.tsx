'use client';

import { useLayoutEffect, useEffect, useRef } from 'react';
import { Project } from '@/types';
import Header from './components/Header';
import ProjectGrid from './components/ProjectGrid';
import AboutSection from './components/AboutSection';
import { usePathname } from 'next/navigation';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export default function ClientPage({ projects }: { projects: Project[] }) {
  const pathname = usePathname();
  const overlayRef = useRef<HTMLDivElement>(null);
  // Check if we are on a project page, but ONLY if we are in the intercepted context.
  // Actually, ClientPage is only rendered in the root layout's children slot.
  // If we are on /project/[slug], ClientPage is NOT rendered at all in the children slot (it's replaced by app/project/[slug]/page.tsx).
  // UNLESS interception is working.
  // If interception works, the URL is /project/[slug], but the children slot still renders app/page.tsx (which renders ClientPage).
  // So checking pathname here IS correct for the interception case.
  const isSheetOpen = pathname?.startsWith('/project/') ?? false;

  useLayoutEffect(() => {
    if (overlayRef.current && !isSheetOpen) {
      gsap.to(overlayRef.current, {
        opacity: 0,
        duration: 0.3,
        delay: 0.15,
        ease: 'power2.inOut',
        onComplete: () => {
          if (overlayRef.current) {
            overlayRef.current.style.display = 'none';
          }
        }
      });
    } else if (overlayRef.current && isSheetOpen) {
      // If we somehow mount with the sheet open (unlikely but possible), hide immediately
      overlayRef.current.style.display = 'none';
    }
  }, []);

  // Force refresh ScrollTrigger on mount to ensure correct positions when navigating back to home
  useEffect(() => {
    if (!isSheetOpen) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        ScrollTrigger.refresh();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isSheetOpen]);

  useLayoutEffect(() => {
    const pageShell = document.querySelector('.page-shell') as HTMLElement;
    if (!pageShell) return;

    if (isSheetOpen) {
      const scrollY = window.scrollY;
      const originY = scrollY + window.innerHeight / 2;
      
      // Ensure body has sheet-open class for the scale effect
      document.body.classList.add('sheet-open');

      // Only set these if they haven't been set yet to avoid resetting on re-renders
      if (!pageShell.classList.contains('page-shell--locked')) {
        pageShell.style.setProperty('--page-scroll-offset', `${scrollY}px`);
        pageShell.style.setProperty('--scale-origin-y', `${originY}px`);
        pageShell.classList.add('page-shell--locked');
      }
    } else {
      if (pageShell.classList.contains('page-shell--locked')) {
        const scrollY = parseInt(pageShell.style.getPropertyValue('--page-scroll-offset') || '0', 10);
        
        // Start the transition back to normal scale/opacity
        document.body.classList.remove('sheet-open');
        
        // Wait for the transition to finish before unlocking the page shell
        // The CSS transition is 220ms
        setTimeout(() => {
          pageShell.classList.remove('page-shell--locked');
          
          document.documentElement.style.setProperty('scroll-behavior', 'auto', 'important');
          window.scrollTo({
            top: scrollY,
            behavior: 'instant'
          });

          setTimeout(() => {
            document.documentElement.style.removeProperty('scroll-behavior');
            pageShell.style.removeProperty('--page-scroll-offset');
            pageShell.style.removeProperty('--scale-origin-y');
            
            // Force a refresh of ScrollTrigger to ensure all positions are correct
            ScrollTrigger.refresh();
          }, 50);
        }, 220);
      }
    }
  }, [isSheetOpen]);

  return (
    <div className="page-shell">
      <div 
        ref={overlayRef}
        className="fixed inset-0 z-[9999] bg-[#e5e5e5] pointer-events-none"
      />
      <Header />
      <main>
        <section className="projects" id="projects">
          <ProjectGrid projects={projects} isSheetOpen={isSheetOpen} />
        </section>
        <AboutSection />
      </main>
    </div>
  );
}
