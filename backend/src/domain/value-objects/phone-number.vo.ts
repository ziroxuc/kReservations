import { BadRequestException } from '@nestjs/common';
import { PHONE_REGEX } from '../../common/constants/business-rules.constants';

/**
 * PhoneNumber Value Object
 * Validates and normalizes phone numbers in international format
 */
export class PhoneNumber {
  private readonly value: string;

  constructor(phone: string) {
    const normalized = this.normalize(phone);

    if (!this.isValid(normalized)) {
      throw new BadRequestException(
        'Invalid phone number format. Use international format (e.g., +1234567890)',
      );
    }

    this.value = normalized;
  }

  private normalize(phone: string): string {
    // Remove spaces, dashes, and parentheses
    return phone.replace(/[\s\-\(\)]/g, '');
  }

  private isValid(phone: string): boolean {
    return PHONE_REGEX.test(phone);
  }

  getValue(): string {
    return this.value;
  }

  toString(): string {
    return this.value;
  }
}
