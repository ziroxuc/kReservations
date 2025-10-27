import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Alternative } from '../../../../core/models/availability.model';
import { RegionService } from '../../../../core/services/region.service';

@Component({
  selector: 'app-alternative-slots',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './alternative-slots.component.html',
  styleUrl: './alternative-slots.component.scss'
})
export class AlternativeSlotsComponent {
  private regionService = inject(RegionService);

  @Input({ required: true }) alternatives!: Alternative[];
  @Output() selectAlternative = new EventEmitter<Alternative>();

  onSelectAlternative(alternative: Alternative): void {
    if (alternative.available) {
      this.selectAlternative.emit(alternative);
    }
  }

  getRegionDisplayName(regionId: string): string {
    const region = this.regionService.getRegionById(regionId);
    return region?.displayName || 'Unknown Region';
  }
}
