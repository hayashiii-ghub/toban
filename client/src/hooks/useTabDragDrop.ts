import { useCallback, useState } from "react";

export function useTabDragDrop(
  handleTabDrop: (draggedId: string, targetId: string) => void,
): {
  draggedTabId: string | null;
  dragOverTabId: string | null;
  onDragStart: (event: React.DragEvent, scheduleId: string) => void;
  onDragOver: (event: React.DragEvent, scheduleId: string) => void;
  onDrop: (event: React.DragEvent, scheduleId: string) => void;
  onDragEnd: () => void;
} {
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
  const [dragOverTabId, setDragOverTabId] = useState<string | null>(null);

  const onDragStart = useCallback((event: React.DragEvent, scheduleId: string) => {
    setDraggedTabId(scheduleId);
    event.dataTransfer.effectAllowed = "move";
  }, []);

  const onDragOver = useCallback((event: React.DragEvent, scheduleId: string) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOverTabId(scheduleId);
  }, []);

  const onDrop = useCallback((event: React.DragEvent, scheduleId: string) => {
    event.preventDefault();
    setDraggedTabId((currentDraggedId) => {
      if (currentDraggedId) handleTabDrop(currentDraggedId, scheduleId);
      return null;
    });
    setDragOverTabId(null);
  }, [handleTabDrop]);

  const onDragEnd = useCallback(() => {
    setDraggedTabId(null);
    setDragOverTabId(null);
  }, []);

  return { draggedTabId, dragOverTabId, onDragStart, onDragOver, onDrop, onDragEnd };
}
