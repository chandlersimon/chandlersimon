import { getAllProjects } from '@/app/lib/projects';
import ClientPage from '../ClientPage';

export default async function Page() {
  const projects = await getAllProjects();
  return <ClientPage projects={projects} />;
}
