import { getAllProjects } from '@/app/lib/projects';
import { notFound } from 'next/navigation';
import ProjectModal from '@/app/components/ProjectModal';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function InterceptedProjectPage({ params }: { params: { slug: string } }) {
  const projects = await getAllProjects();
  const project = projects.find((p) => p.id === params.slug);

  if (!project) {
    notFound();
  }

  return <ProjectModal project={project} />;
}
