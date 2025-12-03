export interface SolarCalculation {
    areaSqM: number;
    panelCount: number;
    capacityKW: number;
    monthlyGeneration: number; // kWh
    monthlySavings: number; // INR
    co2Reduction: number; // kg/year
    treesSaved: number;
}

export const calculateSolarPotential = (points: { x: number, y: number, z: number }[]): SolarCalculation => {
    // 1. Calculate Area using Shoelace formula (assuming points are coplanar-ish and projected to 2D for area)
    // For simplicity in AR, we might just take the bounds or 2 triangles if 4 points.
    // Let's assume 4 points forming a rectangle for the MVP or just use the polygon area.

    // Simple polygon area in 3D (projected to horizontal plane)
    let area = 0;
    const n = points.length;
    if (n < 3) return { areaSqM: 0, panelCount: 0, capacityKW: 0, monthlyGeneration: 0, monthlySavings: 0, co2Reduction: 0, treesSaved: 0 };

    for (let i = 0; i < n; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % n];
        area += (p1.x * p2.z - p2.x * p1.z); // Using X and Z as horizontal plane
    }
    area = Math.abs(area) / 2;

    // 2. Panel Calculation
    // Standard panel: ~1.7m x 1m = 1.7 sq m.
    // Allow for spacing/edge gaps (efficiency factor ~0.8)
    const PANEL_AREA = 1.7;
    const USABLE_AREA_RATIO = 0.8;
    const usableArea = area * USABLE_AREA_RATIO;
    const panelCount = Math.floor(usableArea / PANEL_AREA);

    // 3. System Size
    // ~400W to 550W per panel. Let's use 400W (0.4kW) conservative.
    const PANEL_CAPACITY_KW = 0.4;
    const capacityKW = panelCount * PANEL_CAPACITY_KW;

    // 4. Generation & Savings
    // India average: 4-5 kWh per kW per day.
    // Monthly = Capacity * 4.5 * 30
    const DAILY_GENERATION_PER_KW = 4.5;
    const monthlyGeneration = capacityKW * DAILY_GENERATION_PER_KW * 30;

    // Savings: ~₹7 per unit (average tier)
    const TARIFF_PER_UNIT = 7;
    const monthlySavings = monthlyGeneration * TARIFF_PER_UNIT;

    // 5. Environmental Impact
    // 0.82 kg CO2 per kWh (India grid average)
    const CO2_PER_KWH = 0.82;
    const co2Reduction = monthlyGeneration * 12 * CO2_PER_KWH;

    // Trees: ~20kg CO2 per tree per year
    const CO2_PER_TREE = 20;
    const treesSaved = Math.round(co2Reduction / CO2_PER_TREE);

    return {
        areaSqM: area,
        panelCount,
        capacityKW,
        monthlyGeneration,
        monthlySavings,
        co2Reduction,
        treesSaved
    };
};
