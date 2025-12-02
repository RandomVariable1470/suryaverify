
export const fetchSatelliteImage = async (lat: number, lon: number): Promise<string> => {
    const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!MAPBOX_TOKEN) {
        throw new Error("VITE_MAPBOX_TOKEN is not configured");
    }

    const zoom = 19;
    const width = 1280;
    const height = 1280;
    // @2x for high DPI
    const imageUrl = `/api/mapbox/styles/v1/mapbox/satellite-v9/static/${lon},${lat},${zoom},0/${width}x${height}@2x?access_token=${MAPBOX_TOKEN}`;

    const response = await fetch(imageUrl);
    if (!response.ok) {
        throw new Error(`Failed to fetch satellite imagery: ${response.statusText}`);
    }

    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
            const base64 = base64String.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};
