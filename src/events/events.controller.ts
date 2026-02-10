import { Controller, Post, Get, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { EventsService } from './events.service';
import type { Express } from 'express';
import 'multer';

@Controller('events')
export class EventsController {
    constructor(private readonly eventsService: EventsService) { }

    @Post('ingest')
    @UseInterceptors(FileInterceptor('file'))
    async ingestEvents(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            return { message: 'No file uploaded' };
        }

        const documents = [];
        const lines = file.buffer.toString('utf-8').split('\n').filter(line => line.trim() !== '');

        if (lines.length > 0) {
            const headers = lines[0].split(',').map(h => h.trim());

            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',').map(v => v.trim());
                if (values.length !== headers.length) continue;

                const doc: any = {};
                headers.forEach((header, index) => {
                    doc[header] = values[index];
                });
                documents.push(doc);
            }
        }

        return this.eventsService.ingestEvents(documents);
    }

    @Get()
    async getAllEvents() {
        return this.eventsService.getAllEvents();
    }
}
