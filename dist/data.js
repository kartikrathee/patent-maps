export const cities = [
  { name: 'New York', state: 'New York', lat: 40.7128, lng: -74.006, ages: [12, 25], application: 'Illustrator', gender: 'Male', count: 260 },
  { name: 'Wilmington', state: 'Delaware', lat: 39.7391, lng: -75.5398, ages: [35, 45], application: 'Acrobat', gender: 'Female', count: 120 },
  { name: 'Boise', state: 'Idaho', lat: 43.615, lng: -116.2023, ages: [25, 35], application: 'Illustrator', gender: 'Female', count: 90 },
  { name: 'Portland', state: 'Oregon', lat: 45.5152, lng: -122.6784, ages: [45, 55], application: 'Acrobat', gender: 'Female', count: 90 },
  { name: 'Wichita', state: 'Kansas', lat: 37.6872, lng: -97.3301, ages: [18, 25], application: 'Acrobat', gender: 'Male', count: 80 },
];

export function sampleData() {
  let seed = 127;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  return cities.flatMap(city => Array.from({ length: city.count }, (_, i) => {
    const angle = random() * Math.PI * 2;
    const distance = Math.sqrt(random()) * (i % 3 === 0 ? .85 : .25);
    return {
      id: `${city.name.replaceAll(' ', '-')}-${i + 1}`, city: city.name,
      lat: city.lat + Math.sin(angle) * distance,
      lng: city.lng + Math.cos(angle) * distance / Math.cos(city.lat * Math.PI / 180),
      age: Math.round(city.ages[0] + random() * (city.ages[1] - city.ages[0])),
      application: city.application, gender: city.gender,
    };
  }));
}

export function validateRecords(value) {
  if (!Array.isArray(value) || !value.length || value.length > 2000) throw new Error('Import an array with 1–2,000 records.');
  const ids = new Set();
  return value.map((record, index) => {
    if (!record || typeof record !== 'object') throw new Error(`Record ${index + 1} must be an object.`);
    const { lat, lng } = record;
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 85 || Math.abs(lng) > 180) {
      throw new Error(`Record ${index + 1} needs numeric lat (-85 to 85) and lng (-180 to 180).`);
    }
    const id = String(record.id ?? `record-${index + 1}`);
    if (!id.trim() || id.length > 100 || ids.has(id)) throw new Error(`Record ${index + 1} has an empty or duplicate ID.`);
    ids.add(id);
    const age = record.age ?? 32;
    if (!Number.isFinite(age) || age < 0 || age > 120) throw new Error(`Record ${index + 1} has an invalid age.`);
    return { id, lat, lng, age, city: String(record.city ?? 'Imported location').slice(0, 100), application: String(record.application ?? 'Other').slice(0, 100), gender: String(record.gender ?? 'Unspecified').slice(0, 100) };
  });
}
