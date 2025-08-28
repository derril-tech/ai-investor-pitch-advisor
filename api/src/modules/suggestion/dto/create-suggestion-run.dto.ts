import { IsString, IsOptional, IsArray, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSuggestionRunDto {
  @ApiProperty({ description: 'Deck ID to generate suggestions for' })
  @IsString()
  @IsUUID()
  deckId: string;

  @ApiProperty({
    description: 'Specific slide IDs to analyze (optional)',
    required: false
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  slideIds?: string[];

  @ApiProperty({
    description: 'Types of suggestions to generate',
    required: false,
    example: ['headline_rewrite', 'structure_fix', 'design_tip']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  suggestionTypes?: string[];
}
