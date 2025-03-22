import { memo } from 'react';
import { useArtifact } from '@/hooks/use-artifact';

export function PureArtifactCloseButton() {
  const { artifact, setArtifact } = useArtifact();

  if (!artifact.isVisible) return null;

  return (
    <button
      className="group flex h-7 w-7 items-center justify-center rounded-full bg-white transition-all hover:scale-110 dark:bg-zinc-950"
      onClick={() => {
        setArtifact((draftArtifact) => ({
          ...draftArtifact,
          isVisible: false,
        }));
      }}
    >
      <span className="muted-icon text-current group-hover:text-red-500">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </span>
    </button>
  );
}

export const ArtifactCloseButton = memo(PureArtifactCloseButton);
