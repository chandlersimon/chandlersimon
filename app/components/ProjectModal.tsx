'use client';

import { Project } from '@/types';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import ProjectSheet from './ProjectSheet';

export default function ProjectModal({ project }: { project: Project }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(true);

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleClosed = () => {
    router.back();
  };

  return (
    <ProjectSheet 
      project={project} 
      isOpen={isOpen} 
      onClose={handleClose}
      onClosed={handleClosed}
    />
  );
}
