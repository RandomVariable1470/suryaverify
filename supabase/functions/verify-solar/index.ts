import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lat, lon, sample_id, imageData } = await req.json();
    
    let base64Image: string;
    let imageSource: string;
    let actualLat: number;
    let actualLon: number;
    const zoom = 19;
    const width = 1280;
    const height = 1280;

    // Check if direct image upload or coordinate-based fetch
    if (imageData) {
      console.log('Processing direct image upload...');
      
      // Validate that coordinates are provided with the image
      if (!lat || !lon || isNaN(lat) || isNaN(lon)) {
        return new Response(
          JSON.stringify({ error: 'Coordinates must be provided with uploaded image' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      actualLat = lat;
      actualLon = lon;
      
      // Extract base64 data (remove data URL prefix if present)
      if (imageData.startsWith('data:')) {
        base64Image = imageData.split(',')[1];
      } else {
        base64Image = imageData;
      }
      
      imageSource = 'User Upload';
      console.log('Direct image received, sending to AI for analysis...');
      
    } else {
      console.log(`Processing verification request for coordinates: ${lat}, ${lon}`);

      // Validate coordinates
      if (!lat || !lon || isNaN(lat) || isNaN(lon)) {
        return new Response(
          JSON.stringify({ error: 'Invalid coordinates provided' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      actualLat = lat;
      actualLon = lon;

      // Fetch Mapbox token
      const MAPBOX_API_KEY = Deno.env.get('MAPBOX_API_KEY');
      if (!MAPBOX_API_KEY) {
        console.error('MAPBOX_API_KEY not configured');
        return new Response(
          JSON.stringify({ error: 'Map service not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Construct Mapbox Static Images API URL for satellite imagery
      const imageUrl = `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/${lon},${lat},${zoom},0/${width}x${height}@2x?access_token=${MAPBOX_API_KEY}`;
      
      console.log('Fetching satellite imagery from Mapbox...');

      // Fetch the satellite image
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        console.error('Failed to fetch satellite imagery:', imageResponse.status);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch satellite imagery' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const imageBuffer = await imageResponse.arrayBuffer();
      
      // Convert buffer to base64 in chunks to avoid stack overflow
      const bytes = new Uint8Array(imageBuffer);
      const chunkSize = 8192;
      let binary = '';
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
        binary += String.fromCharCode.apply(null, Array.from(chunk));
      }
      base64Image = btoa(binary);
      
      imageSource = 'Mapbox Satellite';
      console.log('Satellite imagery fetched successfully, sending to AI for analysis...');
    }

    // Call Lovable AI for solar panel detection
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are an expert AI system for analyzing satellite imagery to detect rooftop solar PV installations in India under the PM Surya Ghar: Muft Bijli Yojana scheme.

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

    const userPrompt = `Analyze this satellite imagery at coordinates ${actualLat.toFixed(6)}, ${actualLon.toFixed(6)} in India. 

Determine if rooftop solar panels are present and provide detailed verification data. Consider:
- Panel geometry and arrangement patterns
- Roof characteristics and obstacles (water tanks, clotheslines, AC units)
- Image quality and visibility
- Confidence in detection

Provide your assessment with evidence-based reasoning.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: userPrompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'report_solar_verification',
              description: 'Report the results of rooftop solar panel verification analysis',
              parameters: {
                type: 'object',
                properties: {
                  has_solar: {
                    type: 'boolean',
                    description: 'Whether solar panels are detected on the rooftop'
                  },
                  confidence: {
                    type: 'number',
                    description: 'Confidence level in detection (0.0 to 1.0)',
                    minimum: 0.0,
                    maximum: 1.0
                  },
                  panel_count_est: {
                    type: 'integer',
                    description: 'Estimated number of solar panels visible',
                    minimum: 0
                  },
                  pv_area_sqm_est: {
                    type: 'number',
                    description: 'Estimated total PV area in square meters',
                    minimum: 0
                  },
                  capacity_kw_est: {
                    type: 'number',
                    description: 'Estimated capacity in kW (using 0.2 kW per m² assumption)',
                    minimum: 0
                  },
                  qc_status: {
                    type: 'string',
                    enum: ['VERIFIABLE', 'NOT_VERIFIABLE'],
                    description: 'Quality control status - VERIFIABLE if clear detection is possible, NOT_VERIFIABLE otherwise'
                  },
                  qc_notes: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'List of quality control observations and reasons for the assessment (3-5 specific notes)'
                  },
                  detection_boxes: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        x_min: { type: 'number', description: 'Left edge as fraction of image width (0.0 to 1.0)' },
                        y_min: { type: 'number', description: 'Top edge as fraction of image height (0.0 to 1.0)' },
                        x_max: { type: 'number', description: 'Right edge as fraction of image width (0.0 to 1.0)' },
                        y_max: { type: 'number', description: 'Bottom edge as fraction of image height (0.0 to 1.0)' },
                        confidence: { type: 'number', description: 'Confidence for this specific detection' }
                      },
                      required: ['x_min', 'y_min', 'x_max', 'y_max', 'confidence']
                    },
                    description: 'Array of bounding boxes for detected solar panel areas. Coordinates are normalized (0.0-1.0). Provide 1-5 boxes for main panel clusters. Leave empty if no panels detected.'
                  }
                },
                required: ['has_solar', 'confidence', 'panel_count_est', 'pv_area_sqm_est', 'capacity_kw_est', 'qc_status', 'qc_notes', 'detection_boxes'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'report_solar_verification' } }
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'AI rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI service payment required. Please add credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'AI analysis failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    console.log('AI analysis completed successfully');

    // Extract structured output from tool call
    const toolCall = aiData.choices[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'report_solar_verification') {
      console.error('Unexpected AI response format');
      return new Response(
        JSON.stringify({ error: 'AI response format error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const verificationData = JSON.parse(toolCall.function.arguments);

    // Convert normalized bounding boxes to geographic coordinates
    const metersPerPixel = 156543.03392 * Math.cos(actualLat * Math.PI / 180) / Math.pow(2, zoom);
    const imageWidthMeters = width * metersPerPixel;
    const imageHeightMeters = height * metersPerPixel;
    
    const detectionPolygons = (verificationData.detection_boxes || []).map((box: any) => {
      // Convert normalized coordinates (0-1) to meters from center
      const xMinMeters = (box.x_min - 0.5) * imageWidthMeters;
      const xMaxMeters = (box.x_max - 0.5) * imageWidthMeters;
      const yMinMeters = (0.5 - box.y_max) * imageHeightMeters; // Flip Y axis
      const yMaxMeters = (0.5 - box.y_min) * imageHeightMeters;
      
      // Convert meters to lat/lon offset
      const latPerMeter = 1 / 111320;
      const lonPerMeter = 1 / (111320 * Math.cos(actualLat * Math.PI / 180));
      
      return {
        type: 'Polygon',
        coordinates: [[
          [actualLon + xMinMeters * lonPerMeter, actualLat + yMaxMeters * latPerMeter], // Top-left
          [actualLon + xMaxMeters * lonPerMeter, actualLat + yMaxMeters * latPerMeter], // Top-right
          [actualLon + xMaxMeters * lonPerMeter, actualLat + yMinMeters * latPerMeter], // Bottom-right
          [actualLon + xMinMeters * lonPerMeter, actualLat + yMinMeters * latPerMeter], // Bottom-left
          [actualLon + xMinMeters * lonPerMeter, actualLat + yMaxMeters * latPerMeter], // Close polygon
        ]],
        confidence: box.confidence
      };
    });

    // Construct final result
    const result = {
      sample_id: sample_id || Math.floor(Math.random() * 100000),
      lat: actualLat,
      lon: actualLon,
      has_solar: verificationData.has_solar,
      confidence: verificationData.confidence,
      panel_count_est: verificationData.panel_count_est,
      pv_area_sqm_est: verificationData.pv_area_sqm_est,
      capacity_kw_est: verificationData.capacity_kw_est,
      qc_status: verificationData.qc_status,
      qc_notes: verificationData.qc_notes,
      detection_polygons: detectionPolygons,
      image_metadata: {
        source: imageSource,
        zoom: zoom,
        resolution: 'High',
        timestamp: new Date().toISOString()
      }
    };

    console.log('Verification result:', JSON.stringify(result, null, 2));

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in verify-solar function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
