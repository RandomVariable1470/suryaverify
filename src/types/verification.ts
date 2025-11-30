export interface VerificationResult {
  sample_id: number;
  lat: number;
  lon: number;
  has_solar: boolean;
  confidence: number;
  panel_count_est: number;
  pv_area_sqm_est: number;
  capacity_kw_est: number;
  qc_status: "VERIFIABLE" | "NOT_VERIFIABLE";
  qc_notes: string[];
  bbox_or_mask?: string;
  detection_polygons?: Array<{
    type: 'Polygon';
    coordinates: number[][][];
    confidence: number;
  }>;
  image_metadata: {
    source: string;
    zoom: number;
  };
}
