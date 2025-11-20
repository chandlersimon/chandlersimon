import { getAllProjects } from '@/app/lib/projects';
import ProjectContent from '@/app/components/ProjectContent';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';

interface Props {
  params: {
    slug: string;
  };
}

export async function generateStaticParams() {
  const projects = await getAllProjects();
  return projects.map((project) => ({
    slug: project.id,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const projects = await getAllProjects();
  const project = projects.find((p) => p.id === params.slug);

  if (!project) {
    return {
      title: 'Project Not Found',
    };
  }

  return {
    title: `${project.label} - Chandler Simon`,
    description: project.description || project.sheetTitle,
  };
}

export default async function ProjectPage({ params }: Props) {
  const projects = await getAllProjects();
  const project = projects.find((p) => p.id === params.slug);

  if (!project) {
    notFound();
  }

  return (
    <div className="project-sheet__panel" style={{ 
      transform: 'none', 
      minHeight: '100vh', 
      height: 'auto',
      maxHeight: 'none',
      overflow: 'visible',
      paddingTop: '4rem'
    }}>
      <Link href="/" className="project-sheet__close" aria-label="Back to projects" style={{ position: 'fixed', zIndex: 50 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M24 3.32784L15.3278 12L24 20.6722L20.6722 24L12 15.3278L3.32784 24L0 20.6722L8.67216 12L0 3.32784L3.32784 0L12 8.67216L20.6722 0L24 3.32784Z" fill="black"/>
        </svg>
      </Link>
      <ProjectContent project={project} isStandalone={true} />
    </div>
  );
}
