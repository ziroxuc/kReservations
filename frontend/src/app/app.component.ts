import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { WebSocketService } from './core/services/websocket.service';
import { RegionService } from './core/services/region.service';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, OnDestroy {
  private wsService = inject(WebSocketService);
  private regionService = inject(RegionService);

  async ngOnInit(): Promise<void> {
    // Load regions from API on app startup
    await this.regionService.loadRegions();

    // Connect WebSocket when app initializes
    this.wsService.connect(environment.wsUrl);
  }

  ngOnDestroy(): void {
    // Disconnect WebSocket when app is destroyed
    this.wsService.disconnect();
  }
}
