import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Pencil, Square, Edit3, Trash2, Save, X } from "lucide-react";
import { Badge } from "./ui/badge";

interface AnnotationToolbarProps {
  isActive: boolean;
  annotationCount: number;
  onToggleMode: () => void;
  onDrawPolygon: () => void;
  onDrawRectangle: () => void;
  onToggleEdit: () => void;
  onDeleteSelected: () => void;
  onClearAll: () => void;
  onSave: () => void;
}

const AnnotationToolbar = ({
  isActive,
  annotationCount,
  onToggleMode,
  onDrawPolygon,
  onDrawRectangle,
  onToggleEdit,
  onDeleteSelected,
  onClearAll,
  onSave,
}: AnnotationToolbarProps) => {
  if (!isActive) {
    return (
      <div className="absolute top-6 left-6 z-10 animate-fade-in">
        <Button
          onClick={onToggleMode}
          variant="default"
          size="sm"
          className="shadow-lg backdrop-blur-sm bg-success/90 hover:bg-success border-border/50"
        >
          <Pencil className="w-4 h-4 mr-2" />
          Start Annotation
        </Button>
      </div>
    );
  }

  return (
    <div className="absolute top-6 left-6 z-10 animate-scale-in">
      <Card className="p-3 bg-card/95 backdrop-blur-md shadow-xl border-border/50">
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="default" className="bg-success text-success-foreground">
            Annotation Mode
          </Badge>
          <Badge variant="secondary">{annotationCount} drawn</Badge>
        </div>
        
        <div className="space-y-2">
          <div className="flex gap-2">
            <Button
              onClick={onDrawPolygon}
              variant="outline"
              size="sm"
              className="flex-1"
              title="Draw Polygon"
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <Button
              onClick={onDrawRectangle}
              variant="outline"
              size="sm"
              className="flex-1"
              title="Draw Rectangle"
            >
              <Square className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={onToggleEdit}
              variant="outline"
              size="sm"
              className="flex-1"
              title="Edit Mode"
            >
              <Edit3 className="w-4 h-4" />
            </Button>
            <Button
              onClick={onDeleteSelected}
              variant="outline"
              size="sm"
              className="flex-1"
              title="Delete Selected"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex gap-2 pt-2 border-t border-border">
            <Button
              onClick={onSave}
              variant="default"
              size="sm"
              className="flex-1"
            >
              <Save className="w-4 h-4 mr-1" />
              Save
            </Button>
            <Button
              onClick={onToggleMode}
              variant="secondary"
              size="sm"
              className="flex-1"
            >
              <X className="w-4 h-4 mr-1" />
              Exit
            </Button>
          </div>
          
          {annotationCount > 0 && (
            <Button
              onClick={onClearAll}
              variant="destructive"
              size="sm"
              className="w-full"
            >
              Clear All
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

export default AnnotationToolbar;
