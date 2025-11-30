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
    const { lat, lon, sample_id } = await req.json();
    
    console.log(`Processing verification request for coordinates: ${lat}, ${lon}`);

    // Validate coordinates
    if (!lat || !lon || isNaN(lat) || isNaN(lon)) {
      return new Response(
        JSON.stringify({ error: 'Invalid coordinates provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
    // Using zoom level 19 for high-resolution rooftop details
    const zoom = 19;
    const width = 1280;
    const height = 1280;
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
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
    
    console.log('Satellite imagery fetched successfully, sending to AI for analysis...');

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

DETECTION REQUIREMENTS:
- Look for rectangular/rectilinear grid patterns characteristic of solar panels
- Identify distinct panel edges, mounting frames, or racking systems
- Detect panel shadows, reflections, or glare patterns
- Distinguish solar panels from other reflective surfaces (water tanks, tin roofs, skylights)
- Account for diverse Indian roof types: flat rooftops with obstacles, sloping tiles, tin sheets

QUALITY CONTROL:
- Mark as VERIFIABLE only if you can confidently detect solar panels with clear evidence
- Mark as NOT_VERIFIABLE if: occlusion >50%, heavy cloud cover, poor resolution, unclear imagery
- Provide specific, auditable reasons in qc_notes

Be precise, conservative, and evidence-based. Do NOT hallucinate detections.`;

    const userPrompt = `Analyze this satellite imagery at coordinates ${lat.toFixed(6)}, ${lon.toFixed(6)} in India. 

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
                  }
                },
                required: ['has_solar', 'confidence', 'panel_count_est', 'pv_area_sqm_est', 'capacity_kw_est', 'qc_status', 'qc_notes'],
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

    // Construct final result
    const result = {
      sample_id: sample_id || Math.floor(Math.random() * 100000),
      lat,
      lon,
      has_solar: verificationData.has_solar,
      confidence: verificationData.confidence,
      panel_count_est: verificationData.panel_count_est,
      pv_area_sqm_est: verificationData.pv_area_sqm_est,
      capacity_kw_est: verificationData.capacity_kw_est,
      qc_status: verificationData.qc_status,
      qc_notes: verificationData.qc_notes,
      image_metadata: {
        source: 'Mapbox Satellite',
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
