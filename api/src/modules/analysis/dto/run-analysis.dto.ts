import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty } from 'class-validator';

export class RunAnalysisDto {
  @ApiProperty({
    description: 'The ID of the deck to analyze',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  deckId: string;
}
