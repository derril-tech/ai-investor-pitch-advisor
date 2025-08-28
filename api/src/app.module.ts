import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeckModule } from './modules/deck/deck.module';
import { AnalysisModule } from './modules/analysis/analysis.module';
import { QAModule } from './modules/qa/qa.module';
import { ExportModule } from './modules/export/export.module';
import { SuggestionModule } from './modules/suggestion/suggestion.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_NAME || 'pitch_advisor',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: process.env.NODE_ENV !== 'production',
      logging: process.env.NODE_ENV === 'development',
    }),
    DeckModule,
    AnalysisModule,
    QAModule,
    ExportModule,
    SuggestionModule,
  ],
})
export class AppModule {}
