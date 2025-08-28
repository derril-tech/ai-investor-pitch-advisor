import { ApiProperty } from '@nestjs/swagger';

export class AnalysisResponseDto {
  @ApiProperty({
    description: 'The ID of the analysis',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'The ID of the deck being analyzed',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  deckId: string;

  @ApiProperty({
    description: 'The status of the analysis',
    example: 'completed',
    enum: ['processing', 'completed', 'error'],
  })
  status: string;

  @ApiProperty({
    description: 'The scores for each dimension',
    example: {
      clarity: 7.5,
      design: 6.8,
      storytelling: 8.2,
      investorFit: 7.0,
    },
  })
  scores: Record<string, number>;

  @ApiProperty({
    description: 'Explanations for each score',
    example: {
      clarity: 'Good readability with concise sentences',
      design: 'Consistent visual hierarchy',
    },
  })
  explanations: Record<string, string>;

  @ApiProperty({
    description: 'When the analysis was created',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;
}
