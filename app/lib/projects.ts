import { normalizeProject } from './projectUtils';
import { Project } from '@/types';
import projectsData from '@/content/projects.json';

export async function getAllProjects(): Promise<Project[]> {
  try {
    const rawProjects = projectsData.projects || [];
    return rawProjects.map((p: any, i: number) => normalizeProject(p, i));
  } catch (e) {
    console.error('Failed to load projects:', e);
    return [];
  }
}

export async function getProjectBySlug(slug: string): Promise<Project | undefined> {
  const projects = await getAllProjects();
  return projects.find((p) => p.slug === slug);
}
