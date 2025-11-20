import { Project } from '@/types';
import ProjectCard from './ProjectCard';

interface ProjectGridProps {
  projects: Project[];
  onProjectClick: (project: Project) => void;
}

export default function ProjectGrid({ projects, onProjectClick }: ProjectGridProps) {
  return (
    <div className="gallery-grid" id="galleryGrid" aria-live="polite">
      {projects.map((project, index) => (
        <ProjectCard 
          key={`${project.id}-${index}`} 
          project={project} 
          index={index} 
          onClick={onProjectClick} 
        />
      ))}
    </div>
  );
}
