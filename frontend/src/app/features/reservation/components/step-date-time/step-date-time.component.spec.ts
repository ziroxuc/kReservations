import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StepDateTimeComponent } from './step-date-time.component';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

describe('StepDateTimeComponent', () => {
  let component: StepDateTimeComponent;
  let fixture: ComponentFixture<StepDateTimeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StepDateTimeComponent],
      providers: [
        provideHttpClient(),
        provideRouter([])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(StepDateTimeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have min and max dates', () => {
    expect(component.minDate).toBe('2025-07-24');
    expect(component.maxDate).toBe('2025-07-31');
  });

  it('should enable proceed when date and time selected', () => {
    component['stateService'].updateReservationData({
      date: '2025-07-24',
      timeSlot: '19:00'
    });
    fixture.detectChanges();

    expect(component.canProceed()).toBe(true);
  });
});
