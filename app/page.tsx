import { promises as fs } from 'fs';
import path from 'path';
import ClientPage from './ClientPage';
import { normalizeProject } from '@/app/lib/projectUtils';

async function getProjects() {
  // Try to find projects.json in content/projects.json relative to CWD
  const p = path.join(process.cwd(), 'content/projects.json');

  try {
    const fileContents = await fs.readFile(p, 'utf8');
    const data = JSON.parse(fileContents);
    const rawProjects = data.projects || [];
    return rawProjects.map((p: any, i: number) => normalizeProject(p, i));
  } catch (e) {
    console.error('Failed to load projects:', e);
    return [];
  }
}

export default async function Page() {
  const projects = await getProjects();
  return <ClientPage projects={projects} />;
}
