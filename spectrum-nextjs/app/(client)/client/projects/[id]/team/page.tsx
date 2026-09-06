'use client';

import { useParams } from 'next/navigation';
import TeamWorkspace from '@/components/TeamWorkspace';

export default function ClientTeamWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  return (
    <TeamWorkspace
      jobId={id}
      backHref={`/client/projects/${id}`}
      messagingHref="/client/messaging"
    />
  );
}
