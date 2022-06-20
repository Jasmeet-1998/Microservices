// rabbit-mq injectible services 

import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RmqContext, RmqOptions, Transport } from "@nestjs/microservices";

// implement rabbit mq functionality
@Injectable()
export class RmqService{
    constructor (private readonly configService:ConfigService){}
    // COMMON-INITIALIZER-RABBITMQ for microservices
    // takes name of the rabbit mq queue to be initialized by a microservice
    // with noAck = false we need to manually acknowledge the message before removing it from the queue
    // noAck=true by default i.e Nestjs will automatically acknowlege these rabbitmq messages
    getOptions(queue: string, noAck = false): RmqOptions{
        return{
            transport: Transport.RMQ,
            options:{
                // where rabbit mq be listening on
                urls: [this.configService.get<string>('RABBIT_MQ_URI')],
                // name of the rabbit queue for the microservice
                queue: this.configService.get<string>(`RABBIT_MQ_${queue}_QUEUE`),
                noAck,
                persistent: true // so that the queue maintains the list of messages
            }
        }
    }
    // 📝 method to handle i.e acknowledge the messages when they are received
    ack(context: RmqContext){
        const channel = context.getChannelRef();
        const originalMessage = context.getMessage();
        // 📝 acknowledging the message from rabbit mq & take it off of the queeue
        channel.ack(originalMessage)
    }
}