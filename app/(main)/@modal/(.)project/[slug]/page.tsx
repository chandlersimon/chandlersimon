import { getAllProjects } from '@/app/lib/projects';
import { notFound } from 'next/navigation';
import ProjectModal from '@/app/components/ProjectModal';

export async function generateStaticParams() {
  const projects = await getAllProjects();
  return projects.map((project) => ({
    slug: project.id,
  }));
}

export default async function InterceptedProjectPage({ params }: { params: { slug: string } }) {
  const projects = await getAllProjects();
  const project = projects.find((p) => p.id === params.slug);

  if (!project) {
    notFound();
  }

  return <ProjectModal project={project} />;
}
