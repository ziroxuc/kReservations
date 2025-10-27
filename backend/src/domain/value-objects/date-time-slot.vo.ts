import { BadRequestException } from '@nestjs/common';
import {
  isValidTimeSlot,
  isDateInAllowedRange,
  TimeSlot,
} from '../../common/constants/business-rules.constants';

/**
 * DateTimeSlot Value Object
 * Encapsulates date and time slot validation
 */
export class DateTimeSlot {
  private readonly date: Date;
  private readonly timeSlot: TimeSlot;

  constructor(date: string | Date, timeSlot: string) {
    const parsedDate = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(parsedDate.getTime())) {
      throw new BadRequestException('Invalid date format');
    }

    if (!isDateInAllowedRange(parsedDate)) {
      throw new BadRequestException(
        'Date must be between July 24-31, 2025',
      );
    }

    if (!isValidTimeSlot(timeSlot)) {
      throw new BadRequestException(
        `Invalid time slot. Must be one of: 18:00, 18:30, 19:00, 19:30, 20:00, 20:30, 21:00, 21:30, 22:00`,
      );
    }

    this.date = parsedDate;
    this.timeSlot = timeSlot as TimeSlot;
  }

  getDate(): Date {
    return this.date;
  }

  getTimeSlot(): TimeSlot {
    return this.timeSlot;
  }

  getDateString(): string {
    return this.date.toISOString().split('T')[0];
  }

  toString(): string {
    return `${this.getDateString()} ${this.timeSlot}`;
  }
}
