import { WebSocketGateway, WebSocketServer, OnGatewayConnection, SubscribeMessage, MessageBody } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ cors: true })
export class GatewayGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(GatewayGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`✅ WebSocket Client Connected: ${client.id}`);
  }

  @SubscribeMessage('aggregatedMetrics') // Useful to test what clients send back
  handleIncomingMetrics(@MessageBody() data: any) {
    this.logger.log(`🔥 Received from WebSocket: { current_occupancy: ${data?.current_occupancy} }`);
  }
}
