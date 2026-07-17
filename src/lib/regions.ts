export type Provider = "aws" | "gcp";

export type Continent =
  | "North America"
  | "South America"
  | "Europe"
  | "Middle East"
  | "Asia Pacific"
  | "Africa";

export interface Region {
  id: string;
  code: string;
  abbreviation: string;
  provider: Provider;
  city: string;
  country: string;
  continent: Continent;
  lat: number;
  lon: number;
}

// Coordinates point at the actual data center clusters, not the nearest big
// city — e.g. AWS Oregon is Boardman (not Portland), GCP Belgium is
// St. Ghislain, GCP Finland is Hamina.
export const regions: Region[] = [
  // ── AWS ──────────────────────────────────────────────────────────
  {
    id: "us-east-1",
    code: "us-east-1",
    abbreviation: "use1",
    provider: "aws",
    city: "N. Virginia",
    country: "USA",
    continent: "North America",
    lat: 39.0438,
    lon: -77.4874,
  },
  {
    id: "us-east-2",
    code: "us-east-2",
    abbreviation: "use2",
    provider: "aws",
    city: "Ohio",
    country: "USA",
    continent: "North America",
    lat: 39.9612,
    lon: -82.9988,
  },
  {
    id: "us-west-1",
    code: "us-west-1",
    abbreviation: "usw1",
    provider: "aws",
    city: "N. California",
    country: "USA",
    continent: "North America",
    lat: 37.3382,
    lon: -121.8863,
  },
  {
    id: "us-west-2",
    code: "us-west-2",
    abbreviation: "usw2",
    provider: "aws",
    city: "Oregon",
    country: "USA",
    continent: "North America",
    lat: 45.8399,
    lon: -119.7006,
  },
  {
    id: "ca-central-1",
    code: "ca-central-1",
    abbreviation: "cac1",
    provider: "aws",
    city: "Montreal",
    country: "Canada",
    continent: "North America",
    lat: 45.5017,
    lon: -73.5673,
  },
  {
    id: "ca-west-1",
    code: "ca-west-1",
    abbreviation: "caw1",
    provider: "aws",
    city: "Calgary",
    country: "Canada",
    continent: "North America",
    lat: 51.0447,
    lon: -114.0719,
  },
  {
    id: "mx-central-1",
    code: "mx-central-1",
    abbreviation: "mxc1",
    provider: "aws",
    city: "Querétaro",
    country: "Mexico",
    continent: "North America",
    lat: 20.5888,
    lon: -100.3899,
  },
  {
    id: "sa-east-1",
    code: "sa-east-1",
    abbreviation: "sae1",
    provider: "aws",
    city: "São Paulo",
    country: "Brazil",
    continent: "South America",
    lat: -23.5505,
    lon: -46.6333,
  },
  {
    id: "eu-west-1",
    code: "eu-west-1",
    abbreviation: "euw1",
    provider: "aws",
    city: "Ireland",
    country: "Ireland",
    continent: "Europe",
    lat: 53.3498,
    lon: -6.2603,
  },
  {
    id: "eu-west-2",
    code: "eu-west-2",
    abbreviation: "euw2",
    provider: "aws",
    city: "London",
    country: "UK",
    continent: "Europe",
    lat: 51.5074,
    lon: -0.1278,
  },
  {
    id: "eu-west-3",
    code: "eu-west-3",
    abbreviation: "euw3",
    provider: "aws",
    city: "Paris",
    country: "France",
    continent: "Europe",
    lat: 48.8566,
    lon: 2.3522,
  },
  {
    id: "eu-central-1",
    code: "eu-central-1",
    abbreviation: "euc1",
    provider: "aws",
    city: "Frankfurt",
    country: "Germany",
    continent: "Europe",
    lat: 50.1109,
    lon: 8.6821,
  },
  {
    id: "eu-central-2",
    code: "eu-central-2",
    abbreviation: "euc2",
    provider: "aws",
    city: "Zurich",
    country: "Switzerland",
    continent: "Europe",
    lat: 47.3769,
    lon: 8.5417,
  },
  {
    id: "eu-north-1",
    code: "eu-north-1",
    abbreviation: "eun1",
    provider: "aws",
    city: "Stockholm",
    country: "Sweden",
    continent: "Europe",
    lat: 59.3293,
    lon: 18.0686,
  },
  {
    id: "eu-south-1",
    code: "eu-south-1",
    abbreviation: "eus1",
    provider: "aws",
    city: "Milan",
    country: "Italy",
    continent: "Europe",
    lat: 45.4642,
    lon: 9.19,
  },
  {
    id: "il-central-1",
    code: "il-central-1",
    abbreviation: "ilc1",
    provider: "aws",
    city: "Tel Aviv",
    country: "Israel",
    continent: "Middle East",
    lat: 32.0853,
    lon: 34.7818,
  },
  {
    id: "me-central-1",
    code: "me-central-1",
    abbreviation: "mec1",
    provider: "aws",
    city: "UAE",
    country: "UAE",
    continent: "Middle East",
    lat: 24.4539,
    lon: 54.3773,
  },
  {
    id: "ap-south-1",
    code: "ap-south-1",
    abbreviation: "aps1",
    provider: "aws",
    city: "Mumbai",
    country: "India",
    continent: "Asia Pacific",
    lat: 19.076,
    lon: 72.8777,
  },
  {
    id: "ap-northeast-1",
    code: "ap-northeast-1",
    abbreviation: "apne1",
    provider: "aws",
    city: "Tokyo",
    country: "Japan",
    continent: "Asia Pacific",
    lat: 35.6762,
    lon: 139.6503,
  },
  {
    id: "ap-northeast-2",
    code: "ap-northeast-2",
    abbreviation: "apne2",
    provider: "aws",
    city: "Seoul",
    country: "South Korea",
    continent: "Asia Pacific",
    lat: 37.5665,
    lon: 126.978,
  },
  {
    id: "ap-northeast-3",
    code: "ap-northeast-3",
    abbreviation: "apne3",
    provider: "aws",
    city: "Osaka",
    country: "Japan",
    continent: "Asia Pacific",
    lat: 34.6937,
    lon: 135.5023,
  },
  {
    id: "ap-east-1",
    code: "ap-east-1",
    abbreviation: "ape1",
    provider: "aws",
    city: "Hong Kong",
    country: "Hong Kong",
    continent: "Asia Pacific",
    lat: 22.3193,
    lon: 114.1694,
  },
  {
    id: "ap-southeast-1",
    code: "ap-southeast-1",
    abbreviation: "apse1",
    provider: "aws",
    city: "Singapore",
    country: "Singapore",
    continent: "Asia Pacific",
    lat: 1.3521,
    lon: 103.8198,
  },
  {
    id: "ap-southeast-2",
    code: "ap-southeast-2",
    abbreviation: "apse2",
    provider: "aws",
    city: "Sydney",
    country: "Australia",
    continent: "Asia Pacific",
    lat: -33.8688,
    lon: 151.2093,
  },
  {
    id: "ap-southeast-3",
    code: "ap-southeast-3",
    abbreviation: "apse3",
    provider: "aws",
    city: "Jakarta",
    country: "Indonesia",
    continent: "Asia Pacific",
    lat: -6.2088,
    lon: 106.8456,
  },
  {
    id: "af-south-1",
    code: "af-south-1",
    abbreviation: "afs1",
    provider: "aws",
    city: "Cape Town",
    country: "South Africa",
    continent: "Africa",
    lat: -33.9249,
    lon: 18.4241,
  },
  // ── GCP ──────────────────────────────────────────────────────────
  {
    id: "us-east4",
    code: "us-east4",
    abbreviation: "use4",
    provider: "gcp",
    city: "Ashburn",
    country: "USA",
    continent: "North America",
    lat: 39.0438,
    lon: -77.4874,
  },
  {
    id: "us-central1",
    code: "us-central1",
    abbreviation: "usc1",
    provider: "gcp",
    city: "Iowa",
    country: "USA",
    continent: "North America",
    lat: 41.2619,
    lon: -95.8608,
  },
  {
    id: "us-west1",
    code: "us-west1",
    abbreviation: "usw1g",
    provider: "gcp",
    city: "Oregon",
    country: "USA",
    continent: "North America",
    lat: 45.5946,
    lon: -121.1787,
  },
  {
    id: "europe-west1",
    code: "europe-west1",
    abbreviation: "euwg1",
    provider: "gcp",
    city: "Belgium",
    country: "Belgium",
    continent: "Europe",
    lat: 50.4697,
    lon: 3.811,
  },
  {
    id: "europe-west4",
    code: "europe-west4",
    abbreviation: "euwg4",
    provider: "gcp",
    city: "Netherlands",
    country: "Netherlands",
    continent: "Europe",
    lat: 53.4386,
    lon: 6.8355,
  },
  {
    id: "europe-north1",
    code: "europe-north1",
    abbreviation: "eung1",
    provider: "gcp",
    city: "Finland",
    country: "Finland",
    continent: "Europe",
    lat: 60.5693,
    lon: 27.1878,
  },
  {
    id: "asia-northeast1",
    code: "asia-northeast1",
    abbreviation: "aneg1",
    provider: "gcp",
    city: "Tokyo",
    country: "Japan",
    continent: "Asia Pacific",
    lat: 35.6762,
    lon: 139.6503,
  },
  {
    id: "asia-southeast1",
    code: "asia-southeast1",
    abbreviation: "aseg1",
    provider: "gcp",
    city: "Singapore",
    country: "Singapore",
    continent: "Asia Pacific",
    lat: 1.3521,
    lon: 103.8198,
  },
  {
    id: "southamerica-east1",
    code: "southamerica-east1",
    abbreviation: "saeg1",
    provider: "gcp",
    city: "São Paulo",
    country: "Brazil",
    continent: "South America",
    lat: -23.5505,
    lon: -46.6333,
  },
  {
    id: "australia-southeast1",
    code: "australia-southeast1",
    abbreviation: "auseg1",
    provider: "gcp",
    city: "Sydney",
    country: "Australia",
    continent: "Asia Pacific",
    lat: -33.8688,
    lon: 151.2093,
  },
];

export const CONTINENT_ORDER: Continent[] = [
  "North America",
  "South America",
  "Europe",
  "Middle East",
  "Asia Pacific",
  "Africa",
];

export function getRegionById(id: string): Region | undefined {
  return regions.find((r) => r.id === id);
}

export function getRegionsByProvider(provider: Provider): Region[] {
  return regions.filter((r) => r.provider === provider);
}

export interface RegionGroup {
  key: string;
  lat: number;
  lon: number;
  regions: Region[];
}

/**
 * Group regions that share the same (or very close) coordinates into a single marker.
 * E.g. us-east-1 (AWS) and us-east4 (GCP) both sit in Virginia.
 */
export function groupRegionsByLocation(
  regionList: Region[] = regions
): RegionGroup[] {
  const groups: Map<string, RegionGroup> = new Map();

  for (const region of regionList) {
    // Round to 1 decimal place to catch co-located regions
    const key = `${region.lat.toFixed(1)},${region.lon.toFixed(1)}`;
    const existing = groups.get(key);
    if (existing) {
      existing.regions.push(region);
    } else {
      groups.set(key, {
        key,
        lat: region.lat,
        lon: region.lon,
        regions: [region],
      });
    }
  }

  return Array.from(groups.values());
}
