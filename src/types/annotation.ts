export interface GroundTruthAnnotation {
  id: string;
  type: 'Polygon';
  coordinates: number[][][];
  created_at: string;
  area_sqm: number;
  panel_type?: 'monocrystalline' | 'polycrystalline' | 'thin-film' | 'unknown';
  notes?: string;
}

export interface AnnotationComparison {
  ai_area_sqm: number;
  ground_truth_area_sqm: number;
  iou_score: number;
  agreement_status: 'match' | 'partial' | 'mismatch' | 'missing';
  overlap_area_sqm: number;
}
