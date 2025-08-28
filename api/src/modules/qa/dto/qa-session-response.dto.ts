import { ApiProperty } from '@nestjs/swagger';

export class QAPairDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  question: string;

  @ApiProperty()
  category: string;

  @ApiProperty()
  confidence: number;

  @ApiProperty()
  slideRefs: number[];

  @ApiProperty()
  needsExtraInfo: boolean;

  @ApiProperty({ required: false })
  draftAnswer?: string;

  @ApiProperty({ required: false })
  answerConfidence?: number;

  @ApiProperty({ required: false, type: [String] })
  followUpQuestions?: string[];

  @ApiProperty({ required: false })
  answer?: string;

  @ApiProperty({ required: false })
  answeredAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class QASessionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  deckId: string;

  @ApiProperty()
  sector: string;

  @ApiProperty()
  stage: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  questionCount: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ required: false })
  completedAt?: Date;

  @ApiProperty({ type: [QAPairDto] })
  questions: QAPairDto[];
}
