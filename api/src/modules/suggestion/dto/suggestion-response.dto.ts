import { ApiProperty } from '@nestjs/swagger';

export class SuggestionResponseDto {
  @ApiProperty({ description: 'Suggestion ID' })
  id: string;

  @ApiProperty({ description: 'Deck ID' })
  deckId: string;

  @ApiProperty({ description: 'Slide ID (if applicable)' })
  slideId?: string;

  @ApiProperty({ description: 'Suggestion run ID' })
  runId?: string;

  @ApiProperty({ description: 'Type of suggestion' })
  suggestionType: string;

  @ApiProperty({ description: 'Suggestion title' })
  title: string;

  @ApiProperty({ description: 'Detailed description' })
  description: string;

  @ApiProperty({ description: 'Rationale for the suggestion' })
  rationale: string;

  @ApiProperty({ description: 'Original text (if applicable)' })
  beforeText?: string;

  @ApiProperty({ description: 'Suggested replacement text' })
  afterText?: string;

  @ApiProperty({ description: 'Confidence score (0-1)' })
  confidence: number;

  @ApiProperty({ description: 'Suggestion category' })
  category: string;

  @ApiProperty({ description: 'Current status' })
  status: 'pending' | 'applied' | 'accepted' | 'rejected' | 'dismissed';

  @ApiProperty({ description: 'When suggestion was applied' })
  appliedAt?: Date;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}
