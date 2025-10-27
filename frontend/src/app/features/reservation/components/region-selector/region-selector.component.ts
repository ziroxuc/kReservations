import { Component, Input, Output, EventEmitter, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RegionService } from '../../../../core/services/region.service';
import { RegionWithUI } from '../../../../core/models/region.model';

@Component({
  selector: 'app-region-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './region-selector.component.html',
  styleUrl: './region-selector.component.scss'
})
export class RegionSelectorComponent {
  private regionService = inject(RegionService);

  @Input() selectedRegionId?: string; // Now uses region ID instead of enum
  @Input() partySize = 0;
  @Input() childrenCount = 0;
  @Input() hasSmokingRequest = false;
  @Output() regionSelected = new EventEmitter<string>(); // Emits region ID

  // Get all regions with UI metadata from the service
  protected regions = this.regionService.regionsWithUI;

  // Computed signal: filter regions based on party requirements
  protected availableRegions = computed(() => {
    return this.regionService.getAvailableRegionsForParty(
      this.partySize,
      this.childrenCount > 0,
      this.hasSmokingRequest
    );
  });

  selectRegion(regionId: string): void {
    if (!this.isRegionDisabled(regionId)) {
      this.regionSelected.emit(regionId);
    }
  }

  isRegionDisabled(regionId: string): boolean {
    const region = this.regions().find(r => r.id === regionId);
    if (!region) return true;

    // Check if party size exceeds capacity per table
    if (this.partySize > region.capacity) return true;

    // Check children restrictions
    if (this.childrenCount > 0 && !region.allowChildren) {
      return true;
    }

    // Check smoking restrictions
    if (this.hasSmokingRequest && !region.allowSmoking) {
      return true;
    }

    // If not requesting smoking, disable smoking regions
    if (!this.hasSmokingRequest && region.allowSmoking) {
      return true;
    }

    return false;
  }

  getDisabledReason(regionId: string): string {
    const region = this.regions().find(r => r.id === regionId);
    if (!region) return '';

    if (this.partySize > region.capacity) {
      return `Max capacity per table: ${region.capacity} people`;
    }

    if (this.childrenCount > 0 && !region.allowChildren) {
      return 'Children not allowed in this region';
    }

    if (this.hasSmokingRequest && !region.allowSmoking) {
      return 'Smoking not allowed in this region';
    }

    if (!this.hasSmokingRequest && region.allowSmoking) {
      return 'This is a smoking area';
    }

    return '';
  }

  /**
   * Get region display information
   */
  getRegionInfo(regionId: string): RegionWithUI | undefined {
    return this.regions().find(r => r.id === regionId);
  }
}
