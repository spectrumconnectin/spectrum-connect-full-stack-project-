'use client';

import { useParams } from 'next/navigation';
import TeamWorkspace from '@/components/TeamWorkspace';

export default function CreatorTeamWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  return (
    <TeamWorkspace
      jobId={id}
      backHref={`/creator/projects/${id}`}
      messagingHref="/creator/messaging"
    />
  );
}
