/**
 * Region model matching backend API structure from /regions endpoint
 * Regions are fetched dynamically from the API instead of hardcoded enums
 */
export interface Region {
  id: string; // UUID from backend
  name: string; // e.g., "MAIN_HALL", "BAR", "RIVERSIDE", "RIVERSIDE_SMOKING"
  displayName: string; // User-friendly name for UI
  capacity: number; // Maximum people per table
  tables: number; // Number of tables in this region
  allowChildren: boolean; // Whether children are allowed
  allowSmoking: boolean; // Whether smoking is allowed
  isActive: boolean; // Whether the region is currently active
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

/**
 * UI metadata for regions (icons, features for display)
 * This is frontend-only data for better UX
 */
export interface RegionUIMetadata {
  icon: string;
  features: string[];
}

/**
 * Complete region data including UI metadata
 */
export interface RegionWithUI extends Region {
  icon: string;
  features: string[];
}

/**
 * Helper function to get UI metadata based on region name
 */
export function getRegionUIMetadata(regionName: string): RegionUIMetadata {
  const metadata: Record<string, RegionUIMetadata> = {
    'MAIN_HALL': {
      icon: '🏛️',
      features: ['Non-smoking', 'Children welcome']
    },
    'BAR': {
      icon: '🍸',
      features: ['Non-smoking', 'Adults only']
    },
    'RIVERSIDE': {
      icon: '🌊',
      features: ['Non-smoking', 'Children welcome', 'River view']
    },
    'RIVERSIDE_SMOKING': {
      icon: '🚬',
      features: ['Smoking allowed', 'Adults only', 'River view']
    }
  };

  return metadata[regionName] || {
    icon: '📍',
    features: []
  };
}

/**
 * Enhance a region with UI metadata
 */
export function enrichRegionWithUI(region: Region): RegionWithUI {
  const uiMetadata = getRegionUIMetadata(region.name);
  return {
    ...region,
    ...uiMetadata
  };
}
