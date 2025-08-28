import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Deck } from './entities/deck.entity';

@Injectable()
export class DeckService {
  constructor(
    @InjectRepository(Deck)
    private readonly deckRepository: Repository<Deck>,
  ) {}

  async uploadDeck(file: Express.Multer.File) {
    const deck = this.deckRepository.create({
      name: file.originalname,
      filePath: file.path,
      fileType: file.mimetype,
      fileSize: file.size,
      status: 'pending',
    });

    return this.deckRepository.save(deck);
  }

  async getDeck(id: string) {
    const deck = await this.deckRepository.findOne({ where: { id } });
    
    if (!deck) {
      throw new NotFoundException(`Deck with ID ${id} not found`);
    }
    
    return deck;
  }

  async getDecks() {
    return this.deckRepository.find({
      where: { deletedAt: null },
      order: { createdAt: 'DESC' },
    });
  }
}
