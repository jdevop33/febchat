"use client";

import type { ArtifactKind } from "@/types/shared/shared-types";

export const DocumentSkeleton = ({
  artifactKind,
}: {
  artifactKind: ArtifactKind;
}) => {
  return artifactKind === "image" ? (
    <div className="flex h-[calc(100dvh-60px)] w-full flex-col items-center justify-center gap-4">
      <div
        className="size-96 skeleton-item"
        style={{ borderRadius: "0.5rem" }}
      />
    </div>
  ) : (
    <div className="flex w-full flex-col gap-4">
      <div
        className="h-12 w-1/2 skeleton-item"
        style={{ borderRadius: "0.5rem" }}
      />
      <div
        className="h-5 w-full skeleton-item"
        style={{ borderRadius: "0.5rem" }}
      />
      <div
        className="h-5 w-full skeleton-item"
        style={{ borderRadius: "0.5rem" }}
      />
      <div
        className="h-5 w-1/3 skeleton-item"
        style={{ borderRadius: "0.5rem" }}
      />
      <div
        className="h-5 w-52"
        style={{
          animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
          borderRadius: "0.5rem",
        }}
      />
      <div
        className="h-8 w-52 skeleton-item"
        style={{ borderRadius: "0.5rem" }}
      />
      <div
        className="h-5 w-2/3 skeleton-item"
        style={{ borderRadius: "0.5rem" }}
      />
    </div>
  );
};

export const InlineDocumentSkeleton = () => {
  return (
    <div className="flex w-full flex-col gap-4">
      <div
        className="h-4 w-48 skeleton-item"
        style={{ borderRadius: "0.5rem" }}
      />
      <div
        className="h-4 w-3/4 skeleton-item"
        style={{ borderRadius: "0.5rem" }}
      />
      <div
        className="h-4 w-1/2 skeleton-item"
        style={{ borderRadius: "0.5rem" }}
      />
      <div
        className="h-4 w-64 skeleton-item"
        style={{ borderRadius: "0.5rem" }}
      />
      <div
        className="h-4 w-40 skeleton-item"
        style={{ borderRadius: "0.5rem" }}
      />
      <div
        className="h-4 w-36 skeleton-item"
        style={{ borderRadius: "0.5rem" }}
      />
      <div
        className="h-4 w-64 skeleton-item"
        style={{ borderRadius: "0.5rem" }}
      />
    </div>
  );
};
