import { Controller, Post, Get, Param, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DeckService } from './deck.service';

@ApiTags('Deck')
@Controller('deck')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DeckController {
  constructor(private readonly deckService: DeckService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload pitch deck' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Deck uploaded successfully' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadDeck(@UploadedFile() file: Express.Multer.File) {
    return this.deckService.uploadDeck(file);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get deck details' })
  @ApiResponse({ status: 200, description: 'Deck details retrieved' })
  async getDeck(@Param('id') id: string) {
    return this.deckService.getDeck(id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all decks' })
  @ApiResponse({ status: 200, description: 'Decks retrieved' })
  async getDecks() {
    return this.deckService.getDecks();
  }
}
