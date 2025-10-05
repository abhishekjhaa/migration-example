import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateInvoiceDto {
  @ApiProperty({
    description: 'Order ID to create invoice for',
    example: 'clx1234567890',
  })
  @IsString()
  orderId: string;

  @ApiProperty({
    description: 'Tax rate (0.0 to 1.0)',
    example: 0.1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  taxRate?: number;

  @ApiProperty({
    description: 'Discount amount to apply',
    example: 10.0,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @ApiProperty({
    description: 'Due date for the invoice',
    example: '2024-12-31T23:59:59.000Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  @ValidateIf((o) => o.dueDate !== undefined)
  @IsDateString({}, { message: 'Due date must be a valid date string' })
  dueDate?: string;
}
