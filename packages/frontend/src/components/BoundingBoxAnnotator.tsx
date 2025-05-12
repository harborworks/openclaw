import React, { useRef, useState } from "react";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

export interface BoundingBox {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
}

interface BoundingBoxAnnotatorProps {
  imageUrl: string;
  boxes: BoundingBox[];
  onChange: (boxes: BoundingBox[]) => void;
  labels: string[];
  localBoxIds?: string[];
  onDeleteBox?: (boxId: string) => Promise<void>;
}

export const BoundingBoxAnnotator: React.FC<BoundingBoxAnnotatorProps> = ({ imageUrl, boxes, onChange, labels, localBoxIds = [], onDeleteBox }) => {
  const [drawing, setDrawing] = useState(false);
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);
  const [currentBox, setCurrentBox] = useState<BoundingBox | null>(null);
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
  const [selectedLabel, setSelectedLabel] = useState(labels[0] || "");
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Convert mouse event to image-relative coordinates
  const getRelativeCoords = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    return { x, y };
  };

  // Start drawing a new box
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const { x, y } = getRelativeCoords(e);
    setStart({ x, y });
    setDrawing(true);
    setCurrentBox(null);
    setSelectedBoxId(null);
  };

  // Update the box as the mouse moves
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!drawing || !start) return;
    const { x, y } = getRelativeCoords(e);
    const box: BoundingBox = {
      id: "temp",
      x1: start.x,
      y1: start.y,
      x2: x,
      y2: y,
      label: selectedLabel,
    };
    setCurrentBox(box);
  };

  // Finish drawing and add the box
  const handleMouseUp = () => {
    if (!drawing || !start || !currentBox) {
      setDrawing(false);
      setStart(null);
      setCurrentBox(null);
      return;
    }
    if (Math.abs(currentBox.x2 - currentBox.x1) > 10 && Math.abs(currentBox.y2 - currentBox.y1) > 10) {
      const newBox = { ...currentBox, id: crypto.randomUUID(), label: selectedLabel };
      onChange([...boxes, newBox]);
    }
    setDrawing(false);
    setStart(null);
    setCurrentBox(null);
  };

  // Select a box for label editing or deletion
  const handleBoxClick = (id: string) => {
    setSelectedBoxId(id);
  };

  // Change label of selected box
  const handleLabelChange = (value: string) => {
    setSelectedLabel(value);
    if (selectedBoxId) {
      onChange(
        boxes.map((box) =>
          box.id === selectedBoxId ? { ...box, label: value } : box
        )
      );
    }
  };

  // Delete selected box
  const handleDelete = async () => {
    if (selectedBoxId) {
      const isLocal = localBoxIds.includes(selectedBoxId);
      
      // If it's a saved box and we have a delete handler, call it
      if (!isLocal && onDeleteBox) {
        try {
          await onDeleteBox(selectedBoxId);
        } catch (error) {
          console.error('Failed to delete box from database:', error);
          return; // Don't remove from UI if database deletion failed
        }
      }
      
      // Remove from UI
      onChange(boxes.filter((box) => box.id !== selectedBoxId));
      setSelectedBoxId(null);
    }
  };

  return (
    <div className="relative w-full h-full" ref={containerRef}
      style={{ touchAction: "none", userSelect: "none" }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <img
        ref={imgRef}
        src={imageUrl}
        alt="Annotate"
        className="w-full h-auto select-none pointer-events-none"
        draggable={false}
      />
      {/* Draw existing boxes */}
      {boxes.map((box) => {
        const left = Math.min(box.x1, box.x2);
        const top = Math.min(box.y1, box.y2);
        const width = Math.abs(box.x2 - box.x1);
        const height = Math.abs(box.y2 - box.y1);
        const isLocal = localBoxIds.includes(box.id);
        return (
          <div
            key={box.id}
            className={`absolute border-2 ${
              selectedBoxId === box.id 
                ? "border-blue-500" 
                : isLocal 
                  ? "border-red-500" 
                  : "border-yellow-500"
            } cursor-pointer`}
            style={{
              left,
              top,
              width,
              height,
              pointerEvents: "auto",
            }}
            onClick={() => handleBoxClick(box.id)}
          >
            <span className="absolute left-0 top-0 bg-white bg-opacity-80 text-xs px-1 rounded">
              {box.label}
              {!isLocal && " (saved)"}
            </span>
          </div>
        );
      })}
      {/* Draw the box being drawn */}
      {drawing && currentBox && (
        <div
          className="absolute border-2 border-green-500 pointer-events-none"
          style={{
            left: Math.min(currentBox.x1, currentBox.x2),
            top: Math.min(currentBox.y1, currentBox.y2),
            width: Math.abs(currentBox.x2 - currentBox.x1),
            height: Math.abs(currentBox.y2 - currentBox.y1),
          }}
        />
      )}
      {/* Box label selector and delete button */}
      {selectedBoxId && (
        <div 
          className="absolute z-10 left-2 top-2 bg-white rounded shadow p-2 flex gap-2 items-center"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <Select value={selectedLabel} onValueChange={handleLabelChange}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Label" />
            </SelectTrigger>
            <SelectContent>
              {labels.map((label) => (
                <SelectItem key={label} value={label}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      )}
    </div>
  );
}; 