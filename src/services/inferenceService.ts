
import { VerificationResult } from "@/types/verification";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const MODEL_NAME = "gemini-2.5-flash";

const SYSTEM_PROMPT = `You are an expert AI system for analyzing satellite imagery to detect rooftop solar PV installations in India under the PM Surya Ghar: Muft Bijli Yojana scheme.

Your task is to analyze the provided satellite image and determine:
1. Whether rooftop solar panels are present (has_solar: true/false)
2. Confidence level in your detection (0.0 to 1.0)
3. Estimated number of solar panels visible
4. Estimated total PV area in square meters
5. Estimated capacity in kW (use 0.2 kW per m² assumption)
6. Quality control status (VERIFIABLE or NOT_VERIFIABLE)
7. Quality control notes explaining your assessment
8. Bounding boxes for detected solar panel areas (1-5 boxes for main clusters)

DETECTION REQUIREMENTS:
- Look for rectangular/rectilinear grid patterns characteristic of solar panels
- Identify distinct panel edges, mounting frames, or racking systems
- Detect panel shadows, reflections, or glare patterns
- Distinguish solar panels from other reflective surfaces (water tanks, tin roofs, skylights)
- Account for diverse Indian roof types: flat rooftops with obstacles, sloping tiles, tin sheets

BOUNDING BOXES:
- Provide normalized coordinates (0.0 to 1.0) where (0,0) is top-left, (1,1) is bottom-right
- Draw boxes around major solar panel clusters/arrays
- For scattered panels, group nearby ones into logical zones
- Provide 1-5 boxes total (combine small clusters, separate distinct arrays)
- Each box should have x_min, y_min, x_max, y_max, and confidence
- Leave detection_boxes empty array [] if no panels detected

QUALITY CONTROL:
- Mark as VERIFIABLE only if you can confidently detect solar panels with clear evidence
- Mark as NOT_VERIFIABLE if: occlusion >50%, heavy cloud cover, poor resolution, unclear imagery
- Provide specific, auditable reasons in qc_notes

Be precise, conservative, and evidence-based. Do NOT hallucinate detections.`;

const RESPONSE_SCHEMA = {
    type: "object",
    properties: {
        has_solar: {
            type: "boolean",
            description: "Whether solar panels are detected on the rooftop"
        },
        confidence: {
            type: "number",
            description: "Confidence level in detection (0.0 to 1.0)"
        },
        panel_count_est: {
            type: "integer",
            description: "Estimated number of solar panels visible"
        },
        pv_area_sqm_est: {
            type: "number",
            description: "Estimated total PV area in square meters"
        },
        capacity_kw_est: {
            type: "number",
            description: "Estimated capacity in kW"
        },
        qc_status: {
            type: "string",
            enum: ["VERIFIABLE", "NOT_VERIFIABLE"],
            description: "Quality control status"
        },
        qc_notes: {
            type: "array",
            items: { type: "string" },
            description: "List of quality control observations"
        },
        detection_boxes: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    x_min: { type: "number" },
                    y_min: { type: "number" },
                    x_max: { type: "number" },
                    y_max: { type: "number" },
                    confidence: { type: "number" }
                },
                required: ["x_min", "y_min", "x_max", "y_max", "confidence"]
            },
            description: "Bounding boxes for detected solar panel areas"
        }
    },
    required: ["has_solar", "confidence", "panel_count_est", "pv_area_sqm_est", "capacity_kw_est", "qc_status", "qc_notes", "detection_boxes"]
};

interface GeminiResponse {
    has_solar: boolean;
    confidence: number;
    panel_count_est: number;
    pv_area_sqm_est: number;
    capacity_kw_est: number;
    qc_status: "VERIFIABLE" | "NOT_VERIFIABLE";
    qc_notes: string[];
    detection_boxes: Array<{
        x_min: number;
        y_min: number;
        x_max: number;
        y_max: number;
        confidence: number;
    }>;
}

export const analyzeSolarPotential = async (
    base64Image: string,
    lat: number,
    lon: number,
    sample_id?: number | string
): Promise<VerificationResult> => {
    if (!GEMINI_API_KEY) {
        throw new Error("VITE_GEMINI_API_KEY is not configured");
    }

    const userPrompt = (lat === 0 && lon === 0)
        ? `Analyze this uploaded satellite imagery for rooftop solar panels in India. 
Determine if rooftop solar panels are present and provide detailed verification data. Consider:
- Panel geometry and arrangement patterns
- Roof characteristics and obstacles (water tanks, clotheslines, AC units)
- Image quality and visibility
- Confidence in detection

Provide your assessment with evidence-based reasoning.`
        : `Analyze this satellite imagery at coordinates ${lat.toFixed(6)}, ${lon.toFixed(6)} in India. 
Determine if rooftop solar panels are present and provide detailed verification data. Consider:
- Panel geometry and arrangement patterns
- Roof characteristics and obstacles (water tanks, clotheslines, AC units)
- Image quality and visibility
- Confidence in detection

Provide your assessment with evidence-based reasoning.`;

    const response = await fetch(
        `/api/gemini/v1beta/models/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                system_instruction: {
                    parts: [{ text: SYSTEM_PROMPT }]
                },
                contents: [{
                    parts: [
                        { text: userPrompt },
                        {
                            inline_data: {
                                mime_type: "image/jpeg",
                                data: base64Image
                            }
                        }
                    ]
                }],
                generationConfig: {
                    response_mime_type: "application/json",
                    response_schema: RESPONSE_SCHEMA
                }
            })
        }
    );
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];

    if (!candidate || !candidate.content || !candidate.content.parts || !candidate.content.parts[0].text) {
        throw new Error("Invalid response from Gemini API");
    }

    const resultText = candidate.content.parts[0].text;
    const verificationData: GeminiResponse = JSON.parse(resultText);

    // Convert bounding boxes to polygons
    const zoom = 19;
    const width = 1280;
    const height = 1280;
    const metersPerPixel = 156543.03392 * Math.cos(lat * Math.PI / 180) / Math.pow(2, zoom);
    const imageWidthMeters = width * metersPerPixel;
    const imageHeightMeters = height * metersPerPixel;

    const detectionPolygons = (verificationData.detection_boxes || []).map((box) => {
        // Convert normalized coordinates (0-1) to meters from center
        const xMinMeters = (box.x_min - 0.5) * imageWidthMeters;
        const xMaxMeters = (box.x_max - 0.5) * imageWidthMeters;
        const yMinMeters = (0.5 - box.y_max) * imageHeightMeters; // Flip Y axis
        const yMaxMeters = (0.5 - box.y_min) * imageHeightMeters;

        // Convert meters to lat/lon offset
        const latPerMeter = 1 / 111320;
        const lonPerMeter = 1 / (111320 * Math.cos(lat * Math.PI / 180));

        return {
            type: 'Polygon' as const,
            coordinates: [[
                [lon + xMinMeters * lonPerMeter, lat + yMaxMeters * latPerMeter], // Top-left
                [lon + xMaxMeters * lonPerMeter, lat + yMaxMeters * latPerMeter], // Top-right
                [lon + xMaxMeters * lonPerMeter, lat + yMinMeters * latPerMeter], // Bottom-right
                [lon + xMinMeters * lonPerMeter, lat + yMinMeters * latPerMeter], // Bottom-left
                [lon + xMinMeters * lonPerMeter, lat + yMaxMeters * latPerMeter], // Close polygon
            ]],
            confidence: box.confidence
        };
    });

    return {
        sample_id: typeof sample_id === 'string' ? parseInt(sample_id) || Math.floor(Math.random() * 100000) : (sample_id || Math.floor(Math.random() * 100000)),
        lat,
        lon,
        has_solar: verificationData.has_solar,
        confidence: verificationData.confidence,
        panel_count_est: verificationData.panel_count_est,
        pv_area_sqm_est: verificationData.pv_area_sqm_est,
        capacity_kw_est: verificationData.capacity_kw_est,
        qc_status: verificationData.qc_status,
        qc_notes: verificationData.qc_notes,
        detection_polygons: detectionPolygons,
        image_metadata: {
            source: (lat === 0 && lon === 0) ? "User Upload" : "Mapbox Satellite",
            zoom: zoom
        }
    };
};
