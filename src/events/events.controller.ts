import { Controller, Post, Get, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { EventsService } from './events.service';
import type { Express } from 'express';
import 'multer';

@Controller('events')
export class EventsController {
    constructor(private readonly eventsService: EventsService) { }

   

    @Get()
    async getAllEvents() {
        return this.eventsService.getAllEvents();
    }
}
