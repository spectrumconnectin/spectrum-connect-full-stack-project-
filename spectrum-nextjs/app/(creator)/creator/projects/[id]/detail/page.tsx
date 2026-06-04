'use client';
import { useParams } from 'next/navigation';
import { redirect } from 'next/navigation';
import { useEffect } from 'react';
export default function ProjectDetailRedirect() {
  const { id } = useParams<{ id: string }>();
  useEffect(() => { window.location.replace(`/creator/projects/${id}`); }, [id]);
  return null;
}
