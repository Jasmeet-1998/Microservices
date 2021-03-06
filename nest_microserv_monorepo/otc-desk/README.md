> # Walkthrough setting up Microservices monorepo in Nest.js

> LEGENDS

- [📝] signifies Important concepts & flows

> This walkthrough includes tech..

- Nestjs
- mongodb
- docker
- rabbitmq

> project structure

- [x] otc-desk(monorepo)
  - [x] quote-orders - (root)
    - [x] ticket-generation - microservice
    - [x] auth - microservice

> ## Step-1 Creating a monorepo steps

- mkdir otc-desk and cd into it
- nest new orders
- cd to orders
- nest generate app quote-orders

**Inspect nest-cli.json it will have monorepo true json key:value and a common tsconfig & package.json for both orders & quote-orders**

> ## Step-2 cleaning up

- delete the orders folder from the apps folder inside your otc_desk
- remove orders from nest cli under project section
- and change the root & tsconfigpath values as apps/quote-orders

> ## Step-3 creating further microservices

- cd to otc-desk

                # syntax
                nest g app newmicroserviceName

- nest g app ticket-generation
- nest g app auth

> ## Step-4 starting up d/f microservice or root service

                # cd to otc_desk

                # run root service quote-orders
                npm run start:dev

                # run ticket-generation microservice
                npm run start:dev ticket-generation

> ## Step-5 Sharing code between our d/f microservices/apps we need to create a common library

                # be in otc_desk

                # syntax
                nest g library nameOfLibrary

                # in this project case
                nest g library common

                accept the default @app when terminal asks for it

- a new libs folder will be created that has code that can be shared by all microservices
- check nest-cli u will have now common as liberary their under projects section

> ## Step-6 refCommit: c20d2783b56d41c70d3b63bc293bb4572a556225 setting up mongoDB in nestjs

- npm i @nestjs/mongoose mongoose (this will now be accessible to all apps & liberaries)
- go to libs-> common -> src -> database-> database.module.ts

              # add under the @Module section
              import { Module } from '@nestjs/common';
              import { ConfigService } from '@nestjs/config';
              import { MongooseModule } from '@nestjs/mongoose';

              @Module({
                imports: [
                  MongooseModule.forRootAsync({
                    useFactory: (configService: ConfigService) => ({
                      uri: configService.get<string>('MONGODB_URI'),
                    }),
                    inject: [ConfigService],
                  }),
                ],
              })

              export class DatabaseModule {}

- forRoot takes the connection URI to connect to mongoDB database
- configService to fetch mongodbURI from env
- forRootAsync to avoid blocking the event loop
- injecting ConfigService to be used by DatabaseModule

              libs-> common -> src
              database
                - abstract.repository
                - abstract.schema
                - database.module

- be in root otc_desk then -> npm i @nestjs/config

> **NOTE- make sure u delete the .git from otc_desk then do git add . git commit**

> ## Step-7 refCommit:368fcea3ed3b7e30e7e3ea86131be878a0cba15b Using common library into root and microservices

                # start root app
                npm run start:dev quote-orders

> 1.  use database.module inside quote-orders.module for DB connection

                # imports ConfigModule injected by DatabaseModule of the common libs
                imports: [ConfigModule.forRoot({
                  isGlobal: true
                })]

- **isGlobal:true will help in making ConfigModule available globally in entire quotes-order application i.e no need to reinstantiated**

> 2.  validationSchema checks wheather their are certain env variables defined if not defined then throw error on app startup use joi to do that or any other package like zod or yup

              # cd to otc_desk
              npm i joi

> ## Step-8 set up docker-compose to run all microservices independently

- create docker-compose.yaml in root directory i.e otc_desk

> ### Note- use replica set in mongoDB to make use of DB transaction functionality

> MongoDB transaction For situations that require atomicity of reads and writes to multiple documents (in a single or multiple collections), MongoDB supports multi-document transactions. With distributed transactions, transactions can be used across multiple operations, collections, databases, documents, and shards. **ref: https://www.mongodb.com/docs/manual/core/transactions/#:~:text=For%20situations%20that%20require%20atomicity,databases%2C%20documents%2C%20and%20shards.**

- docker-compose replica set - ref: https://github.com/bitnami/bitnami-docker-mongodb/blob/master/docker-compose-replicaset.yml**

- create Dockerfile.yml for each of the microservice that will be the entry for building continers for those microservice via the common root level docker-compose.yml file

            # build new images and also reset volumes in development
            # no need to specify -V in production
            docker compose up --build -V

> ## Step-9 class validator ref: https://www.npmjs.com/package/class-validator, https://docs.nestjs.com/techniques/validation

- **validations for dto's / request**

              # at root otc_desk
              npm i class-validator

- **also install 'class-transformer' needed for making class-validator work properly**

Note- make sure to do docker-compose up --build -V each time new dependency is installed

> ## Step-10 Connecting the microservices in the application & configure/setup rabbitmq as common libs

- initializing the ticket-generation as rabbitmq microservice

              # at root otc_desk
              # add depend to establish connection to rabbit mq & setup ticket-generation as microservice

              @nestjs/microservices
              amqplib
              amqp-connection-manager

- new folder rabbitmq inside of libs(common-code) with services and module

- use common initializer rmq service by ticket-generation -> main.ts

> # IMP:📝 Step - 11 quote-orders Communicating with ticket-generation via rabbitmq

ref: https://docs.nestjs.com/microservices/rabbitmq

- create a dynamic module check rmq.module.ts
- this will help in using the dynamic rmq module inside of quote-orders microservice to register the ticket-generation microservice & use it to communicate with it

- next import the rmq module inside of quote-orders module

- finally inject the ticket-generation service in quote-order.service.ts so that the two can interact.

> # IMP: Step- 12 📝 ATOMIC Transactions The flow (Database transactions included)

> FLOW: quote-orders microservice will createOrder and then on success it will emit an event to ticket-generation microservice which then will generate a ticket.

- **Database Transactions makes sure that a functionality is only performed if database calls seed if seed not called then dont call that functionality.**

- creating database transaction session & emitting the event

> ref: quote-orders.services

> IMP: 📝**make use of rxjs to implement reactive programming to handle observables,async implementations, callbacks and event based programs.**

> # IMP: Step- 13 📝 ticket-microservice recieving event

ref: ticket-generation controller

> # Imp : Step-14 📝 handling ack for the messages in rabbit mq to avoid re-replaying the old messages.

- since if we set ack:false then their is a manual requirement to acknowledge the messages in rabbitmq

- ref: rmq.service.ts where a ack() that will acknowledge the existing messages that are read are take of the queue

- further inject the rabbit mq service to use manual ack() inside of the ticket-generation.controller.ts

- **ref: deaa8149d42dbb336ceb30d0778af47ae9b91a9c & 8fda433dc8bc6f25ada7b13dfd5f7d471f8b82ec**

> # Step -15 setting up authentication to system auth(microservice) (JWT approach) ref: https://docs.nestjs.com/security/authentication

- for user login (local strategy) email & password
- (jwt strategy) with jwt to authenticate the microservices so that all messages recieved have authentication on them and their is protected comms b/w microservices.

                  # at otc_desk level
                  # add
                  @nestjs/jwt @nestjs/passport bcrypt cookie-parser passport passport-jwt passport-local
                  # add dev depend as -D
                  @types/cookie-parser @types/passport-jwt @types/passport-local

- ref: otc_desk -> apps-> auth-> src

- jwt strategy(internal use) is used by rabbit mq to authenticate request and then get details of the refference user with it, while local strategy(extenral-use) used for simple email and password login to then generate jwt's

> # Step-16 to add auth in http and over rabbitmq service we create a common libs auth

- ref: libs>common>src>auth

- **IMP : 📝rxjs observables are push system for javascript, contrast to promise , promise deal with one asynchronous event at a time, while observables handle a sequence of asynchronous event over a period of time plus promises are immediately executed after creation while observables are lazy they are not executed i.e do not gives back response until we subscribe them using the subscribe() method**

> JwtAuthGuard applied to quote-orders i.e made them protected routes ref: eab50ca3370979ff4ff37fbd14b5dd9b66298390
