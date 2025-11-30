import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { GroundTruthAnnotation, AnnotationComparison } from "@/types/annotation";
import { Trash2, Edit2 } from "lucide-react";
import AnimatedNumber from "./AnimatedNumber";

interface AnnotationPanelProps {
  annotations: GroundTruthAnnotation[];
  comparison: AnnotationComparison | null;
  onUpdateAnnotation: (id: string, updates: Partial<GroundTruthAnnotation>) => void;
  onDeleteAnnotation: (id: string) => void;
}

const AnnotationPanel = ({
  annotations,
  comparison,
  onUpdateAnnotation,
  onDeleteAnnotation,
}: AnnotationPanelProps) => {
  if (annotations.length === 0 && !comparison) {
    return null;
  }

  const totalArea = annotations.reduce((sum, ann) => sum + ann.area_sqm, 0);

  return (
    <div className="space-y-4">
      {/* Comparison Card */}
      {comparison && (
        <Card className="shadow-[0_2px_8px_hsla(150,15%,20%,0.08)] dark:shadow-[0_2px_8px_hsla(0,0%,0%,0.3)] border border-border animate-fade-in rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg">Ground Truth Comparison</CardTitle>
            <CardDescription>AI Detection vs Manual Annotation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-secondary/30 rounded-xl">
                <p className="text-xs text-muted-foreground mb-1">AI Detected</p>
                <p className="text-lg font-bold text-foreground">
                  <AnimatedNumber value={comparison.ai_area_sqm} decimals={1} suffix=" m²" />
                </p>
              </div>
              <div className="p-3 bg-success/10 rounded-xl">
                <p className="text-xs text-muted-foreground mb-1">Ground Truth</p>
                <p className="text-lg font-bold text-foreground">
                  <AnimatedNumber value={comparison.ground_truth_area_sqm} decimals={1} suffix=" m²" />
                </p>
              </div>
            </div>
            
            <div className="p-4 bg-accent/10 rounded-xl">
              <p className="text-xs text-muted-foreground mb-1">IoU Score (Overlap)</p>
              <div className="flex items-center justify-between">
                <p className="text-2xl font-bold text-foreground">
                  <AnimatedNumber value={comparison.iou_score * 100} decimals={1} suffix="%" />
                </p>
                <Badge variant={
                  comparison.agreement_status === 'match' ? 'default' :
                  comparison.agreement_status === 'partial' ? 'secondary' : 'destructive'
                }>
                  {comparison.agreement_status}
                </Badge>
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              <p>Overlap Area: <span className="font-semibold">{comparison.overlap_area_sqm.toFixed(1)} m²</span></p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Annotations List */}
      {annotations.length > 0 && (
        <Card className="shadow-[0_2px_8px_hsla(150,15%,20%,0.08)] dark:shadow-[0_2px_8px_hsla(0,0%,0%,0.3)] border border-border animate-fade-in rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg">Manual Annotations</CardTitle>
            <CardDescription>{annotations.length} annotation{annotations.length !== 1 ? 's' : ''} • Total: {totalArea.toFixed(1)} m²</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {annotations.map((annotation, idx) => (
              <div
                key={annotation.id}
                className="p-3 bg-secondary/20 rounded-lg border border-border/50 space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">Zone {idx + 1}</p>
                    <p className="text-xs text-muted-foreground">Area: {annotation.area_sqm.toFixed(1)} m²</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeleteAnnotation(annotation.id)}
                    className="h-8 w-8 p-0"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>

                <Select
                  value={annotation.panel_type || 'unknown'}
                  onValueChange={(value) => onUpdateAnnotation(annotation.id, { panel_type: value as any })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Panel type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monocrystalline">Monocrystalline</SelectItem>
                    <SelectItem value="polycrystalline">Polycrystalline</SelectItem>
                    <SelectItem value="thin-film">Thin Film</SelectItem>
                    <SelectItem value="unknown">Unknown</SelectItem>
                  </SelectContent>
                </Select>

                <Textarea
                  placeholder="Add notes..."
                  value={annotation.notes || ''}
                  onChange={(e) => onUpdateAnnotation(annotation.id, { notes: e.target.value })}
                  className="min-h-[60px] text-xs"
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AnnotationPanel;
