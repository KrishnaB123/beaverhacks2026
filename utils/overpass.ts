export const getNearbyFeatures = async (lat: number, lon: number): Promise<string[]> => {
  const radius = 5000; // 5km radius
  
  const query = `
    [out:json];
    (
      node["natural"](around:${radius},${lat},${lon});
      way["natural"](around:${radius},${lat},${lon});
      node["water"](around:${radius},${lat},${lon});
      way["landuse"](around:${radius},${lat},${lon});
    );
    out tags;
  `;

  const response = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: query,
  });

  const data = await response.json();

  const features = new Set<string>();
  for (const element of data.elements) {
    if (element.tags?.natural) features.add(element.tags.natural);
    if (element.tags?.water) features.add(element.tags.water);
    if (element.tags?.landuse) features.add(element.tags.landuse);
  }

  return Array.from(features).slice(0, 5); // top 5 features
};