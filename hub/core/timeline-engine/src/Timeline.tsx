"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { cn } from "./lib/utils";
import {
  TimelineBlock,
  TimelineLayout,
  TimelineProvider,
  Entity,
  reorderBlocks,
} from "@hub/timeline-engine";

interface TimelineProps {
  entities: Entity[];
  provider: TimelineProvider;
  layout?: Partial<TimelineLayout>;
  onReorder?: (blocks: TimelineBlock[]) => void;
  className?: string;
}

export function Timeline({
  entities,
  provider,
  layout,
  onReorder,
  className,
}: TimelineProps) {
  const [blocks, setBlocks] = useState<TimelineBlock[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    provider.getBlocks(entities).then(setBlocks);
  }, [entities, provider]);

  const handleDragStart = useCallback(
    (e: React.DragEvent, blockId: string) => {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", blockId);
      setDraggingId(blockId);
    },
    []
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragOverIndex(index);
    },
    []
  );

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetIndex: number) => {
      e.preventDefault();
      const sourceId = e.dataTransfer.getData("text/plain");
      const sourceIndex = blocks.findIndex((b) => b.id === sourceId);
      if (sourceIndex !== -1 && sourceIndex !== targetIndex) {
        const newBlocks = reorderBlocks(blocks, sourceIndex, targetIndex);
        setBlocks(newBlocks);
        onReorder?.(newBlocks);
      }
      setDraggingId(null);
      setDragOverIndex(null);
    },
    [blocks, onReorder]
  );

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
    setDragOverIndex(null);
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn("timeline-container", className)}
      role="list"
      aria-label="Timeline de entidades"
    >
      <div
        className="timeline-track"
        style={{ height: layout?.viewport?.height || 400 }}
      >
        {blocks.map((block, index) => (
          <TimelineBlockComponent
            key={block.id}
            block={block}
            index={index}
            isDragging={draggingId === block.id}
            isDragOver={dragOverIndex === index}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
          />
        ))}
      </div>
      <div className="timeline-ruler" aria-hidden="true">
        {[...Array(24)].map((_, i) => (
          <span key={i} className="ruler-mark" style={{ left: `${i * 220}px` }}>
            {i}
          </span>
        ))}
      </div>
    </div>
  );
}

interface TimelineBlockComponentProps {
  block: TimelineBlock;
  index: number;
  isDragging: boolean;
  isDragOver: boolean;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, blockId: string) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
  onDragEnd: () => void;
}

function TimelineBlockComponent({
  block,
  index,
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}: TimelineBlockComponentProps) {
  return (
    <div
      className={cn(
        "timeline-block",
        isDragging && "dragging",
        isDragOver && "drag-over"
      )}
      draggable
      onDragStart={(e) => onDragStart(e, block.id)}
      onDragOver={(e) => onDragOver(e, index)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, index)}
      onDragEnd={onDragEnd}
      style={{
        transform: `translate(${block.x}px, ${block.y}px)`,
        width: block.width,
        height: block.height,
      }}
      role="listitem"
      aria-label={`Bloco ${index + 1}: ${String(block.metadata?.entityType || "Entidade")}`}
      tabIndex={0}
    >
      <div className="block-header">
        <span className="block-order">{index + 1}</span>
        <span className="block-type">{String(block.metadata?.entityType || "Entity")}</span>
      </div>
      <div className="block-content">
        <span className="drag-handle inline-block" aria-label="Arrastar para reordenar"><DragHandle /></span>
      </div>
    </div>
  );
}

function DragHandle() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M9 3v18M15 3v18" />
      <path d="M3 9h18M3 15h18" />
    </svg>
  );
}