import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreateOrderDto {
  @ApiProperty({
    description: 'Customer ID',
    example: 'clx1234567890',
  })
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @ApiProperty({
    description: 'Order status',
    enum: ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED'],
    example: 'PENDING',
  })
  @IsEnum(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED'])
  status: string;

  @ApiProperty({
    description: 'Order total amount',
    example: 100.0,
  })
  @IsNumber()
  @IsPositive()
  total: number;

  @ApiProperty({
    description: 'Order subtotal amount',
    example: 90.0,
  })
  @IsNumber()
  @IsPositive()
  subtotal: number;

  @ApiProperty({
    description: 'Tax amount',
    example: 10.0,
  })
  @IsNumber()
  @IsOptional()
  tax?: number;

  @ApiProperty({
    description: 'Discount amount',
    example: 0,
  })
  @IsNumber()
  @IsOptional()
  discount?: number;

  @ApiProperty({
    description: 'Order notes',
    example: 'Special delivery instructions',
    required: false,
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
