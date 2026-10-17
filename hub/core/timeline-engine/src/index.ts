export interface Entity {
  id: string;
  label: string;
  metadata: Record<string, unknown>;
  type: string;
}

export interface TimelineBlock {
  id: string;
  entityId: string;
  order: number;
  x: number;
  y: number;
  width: number;
  height: number;
  metadata?: Record<string, unknown>;
}

export interface TimelineLayout {
  blocks: TimelineBlock[];
  viewport: { width: number; height: number };
  scale: number;
}

export interface TimelineProvider {
  getBlocks(entities: Entity[]): Promise<TimelineBlock[]>;
  reorder(blocks: TimelineBlock[], fromIndex: number, toIndex: number): TimelineBlock[];
  toXml(blocks: TimelineBlock[], entities: Entity[]): string;
  validate(blocks: TimelineBlock[], entities: Entity[]): ValidationResult;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  blockId: string;
  message: string;
  severity: 'error' | 'warning';
}

export function createTimelineBlock(entity: Entity, index: number): TimelineBlock {
  return {
    id: `block-${entity.id}`,
    entityId: entity.id,
    order: index,
    x: index * 220,
    y: 50,
    width: 200,
    height: 120,
    metadata: { entityType: entity.type },
  };
}

export function orderBlocks(blocks: TimelineBlock[]): TimelineBlock[] {
  return [...blocks].sort((a, b) => a.order - b.order);
}

export function reorderBlocks(
  blocks: TimelineBlock[],
  fromIndex: number,
  toIndex: number
): TimelineBlock[] {
  const result = [...blocks];
  const [removed] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, removed);
  return result.map((block, index) => ({ ...block, order: index }));
}