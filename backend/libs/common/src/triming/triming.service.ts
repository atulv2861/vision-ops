import { Injectable } from '@nestjs/common';

@Injectable()
export class TrimingService {
  async trimVideo(videoPath: string, start: number, end: number): Promise<string> {
    // Video trimming service implementation when needed
    console.log(`Trimming video ${videoPath} from ${start} to ${end}`);
    return videoPath;
  }
}
