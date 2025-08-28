import { IsString, IsOptional, IsNumber, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateQASessionDto {
  @ApiProperty({ description: 'Deck ID' })
  @IsString()
  deckId: string;

  @ApiProperty({ description: 'Session name', default: 'Investor Q&A Session' })
  @IsString()
  @IsOptional()
  name?: string = 'Investor Q&A Session';

  @ApiProperty({ description: 'Sector', default: 'Technology' })
  @IsString()
  @IsOptional()
  sector?: string = 'Technology';

  @ApiProperty({ description: 'Funding stage', default: 'Series A' })
  @IsString()
  @IsIn(['Seed', 'Series A', 'Series B', 'Series C', 'Series D+'])
  @IsOptional()
  stage?: string = 'Series A';

  @ApiProperty({ description: 'Number of questions to generate', default: 20 })
  @IsNumber()
  @IsOptional()
  numQuestions?: number = 20;
}
