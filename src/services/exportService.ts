
import JSZip from 'jszip';
import { VerificationResult } from '@/types/verification';

export const generateGeoJSON = (results: VerificationResult[]) => {
    const features: any[] = [];

    results.forEach((result) => {
        if (!result.detection_polygons || result.detection_polygons.length === 0) {
            // Include location point even if no detections
            features.push({
                type: "Feature",
                id: `verification_${result.sample_id}`,
                geometry: {
                    type: "Point",
                    coordinates: [result.lon, result.lat]
                },
                properties: {
                    sample_id: result.sample_id,
                    has_solar: result.has_solar,
                    confidence: result.confidence,
                    qc_status: result.qc_status,
                    verification_type: "no_detection"
                }
            });
        } else {
            result.detection_polygons.forEach((polygon, idx) => {
                features.push({
                    type: "Feature",
                    id: `detection_${result.sample_id}_${idx + 1}`,
                    geometry: {
                        type: polygon.type,
                        coordinates: polygon.coordinates
                    },
                    properties: {
                        sample_id: result.sample_id,
                        zone_id: idx + 1,
                        center_lat: result.lat,
                        center_lon: result.lon,
                        has_solar: result.has_solar,
                        overall_confidence: result.confidence,
                        zone_confidence: polygon.confidence,
                        panel_count: result.panel_count_est,
                        pv_area_sqm: result.pv_area_sqm_est,
                        capacity_kw: result.capacity_kw_est,
                        qc_status: result.qc_status,
                        verification_type: "solar_detection",
                        detection_method: "AI-powered satellite imagery analysis"
                    }
                });
            });
        }
    });

    return {
        type: "FeatureCollection",
        metadata: {
            export_date: new Date().toISOString(),
            total_verifications: results.length,
            total_detections: results.filter(r => r.has_solar).length,
            source: "SuryaVerify - PM Surya Ghar Verification System",
            export_format: "GeoJSON"
        },
        features
    };
};

export const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

export const exportResults = async (results: VerificationResult[]) => {
    if (results.length === 0) return;

    const hasDetectionPolygons = results.some(r => r.detection_polygons && r.detection_polygons.length > 0);

    // If it's a batch export (more than 1 result) or explicitly requested as ZIP (not implemented yet, but good practice)
    // For now, if we have multiple results, we can still export as a single GeoJSON or JSON.
    // But the prompt asked for "output ZIP with JSONs + overlays" for CSV Batch.
    // I'll add a specific function for Batch Export which returns a ZIP.

    if (hasDetectionPolygons) {
        const geojson = generateGeoJSON(results);
        const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/geo+json' });
        downloadBlob(blob, `verification_results_${new Date().toISOString().split('T')[0]}.geojson`);
    } else {
        const dataStr = JSON.stringify(results, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        downloadBlob(blob, `verification_results_${new Date().toISOString().split('T')[0]}.json`);
    }
};

export const exportBatchToZip = async (results: VerificationResult[]) => {
    const zip = new JSZip();
    const dateStr = new Date().toISOString().split('T')[0];

    // 1. Master GeoJSON
    const geojson = generateGeoJSON(results);
    zip.file(`all_results_${dateStr}.geojson`, JSON.stringify(geojson, null, 2));

    // 2. Individual JSONs
    const jsonFolder = zip.folder("json_reports");
    results.forEach(result => {
        jsonFolder?.file(`report_${result.sample_id}.json`, JSON.stringify(result, null, 2));
    });

    // 3. Summary CSV (optional but helpful)
    const csvHeader = "sample_id,lat,lon,has_solar,confidence,panel_count_est,capacity_kw_est,qc_status\n";
    const csvRows = results.map(r =>
        `${r.sample_id},${r.lat},${r.lon},${r.has_solar},${r.confidence},${r.panel_count_est},${r.capacity_kw_est},${r.qc_status}`
    ).join("\n");
    zip.file(`summary_${dateStr}.csv`, csvHeader + csvRows);

    const content = await zip.generateAsync({ type: "blob" });
    downloadBlob(content, `batch_verification_export_${dateStr}.zip`);
};
