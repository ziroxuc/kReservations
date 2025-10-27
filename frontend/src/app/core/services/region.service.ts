import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Region, enrichRegionWithUI, RegionWithUI } from '../models/region.model';
import { environment } from '../../../environments/environment';

/**
 * RegionService - Manages region data fetched dynamically from the backend
 * Regions are loaded once on app initialization and cached using Angular Signals
 */
@Injectable({ providedIn: 'root' })
export class RegionService {
  private http = inject(HttpClient);
  private baseUrl = environment.wsUrl; // Use wsUrl which is http://localhost:3000

  // Private writable signal for regions
  private _regions = signal<Region[]>([]);

  // Private signal for loading state
  private _loading = signal<boolean>(false);

  // Private signal for error state
  private _error = signal<string | null>(null);

  // Public readonly signals
  readonly regions = this._regions.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  // Computed signal: regions enriched with UI metadata
  readonly regionsWithUI = computed<RegionWithUI[]>(() => {
    return this._regions().map(region => enrichRegionWithUI(region));
  });

  // Computed signal: check if regions are loaded
  readonly isLoaded = computed(() => this._regions().length > 0);

  /**
   * Fetch regions from the backend API
   * This should be called once during app initialization
   */
  async loadRegions(): Promise<void> {
    if (this._loading()) {
      return; // Prevent multiple simultaneous loads
    }

    this._loading.set(true);
    this._error.set(null);

    try {
      // Fetch regions from the /regions endpoint (baseUrl + /regions)
      const regions = await this.http.get<Region[]>(`${this.baseUrl}/regions`).toPromise();

      if (regions && regions.length > 0) {
        // Filter only active regions
        const activeRegions = regions.filter(r => r.isActive);
        this._regions.set(activeRegions);
        console.log('✅ Loaded', activeRegions.length, 'regions from API:', this.baseUrl + '/regions');
      } else {
        throw new Error('No regions data received from API');
      }
    } catch (error) {
      console.error('❌ Failed to load regions from', this.baseUrl + '/regions', error);
      this._error.set('Failed to load regions from server. Please refresh the page.');
      // No fallback - app requires API to be available
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Get a specific region by ID
   */
  getRegionById(id: string): Region | undefined {
    return this._regions().find(r => r.id === id);
  }

  /**
   * Get a specific region with UI metadata by ID
   */
  getRegionWithUIById(id: string): RegionWithUI | undefined {
    return this.regionsWithUI().find(r => r.id === id);
  }

  /**
   * Filter regions based on party requirements
   */
  getAvailableRegionsForParty(
    partySize: number,
    hasChildren: boolean,
    needsSmoking: boolean
  ): RegionWithUI[] {
    return this.regionsWithUI().filter(region => {
      // Check capacity per table (party must fit in one table)
      if (partySize > region.capacity) {
        return false;
      }

      // Check children restrictions
      if (hasChildren && !region.allowChildren) {
        return false;
      }

      // Check smoking restrictions
      if (needsSmoking && !region.allowSmoking) {
        return false;
      }

      // If not smoking, filter out smoking regions
      if (!needsSmoking && region.allowSmoking) {
        return false;
      }

      return true;
    });
  }
}
