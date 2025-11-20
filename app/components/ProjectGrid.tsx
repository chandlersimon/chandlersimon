import { Project } from '@/types';
import ProjectCard from './ProjectCard';

interface ProjectGridProps {
  projects: Project[];
  isSheetOpen?: boolean;
}

export default function ProjectGrid({ projects, isSheetOpen = false }: ProjectGridProps) {
  return (
    <div className="gallery-grid" id="galleryGrid" aria-live="polite">
      {projects.map((project, index) => (
        <ProjectCard 
          key={`${project.id}-${index}`} 
          project={project} 
          index={index} 
          isSheetOpen={isSheetOpen}
        />
      ))}
    </div>
  );
}
