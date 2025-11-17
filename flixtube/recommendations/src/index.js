const express = require("express");
const mongodb = require("mongodb");
const amqp = require("amqplib");

if (!process.env.PORT) {
    throw new Error("Please specify the port number for the HTTP server with the environment variable PORT.");
}

if (!process.env.DBHOST) {
    throw new Error("Please specify the databse host using environment variable DBHOST.");
}

if (!process.env.DBNAME) {
    throw new Error("Please specify the name of the database using environment variable DBNAME");
}

if (!process.env.RABBIT) {
    throw new Error("Please specify the name of the RabbitMQ host using environment variable RABBIT");
}

const PORT = process.env.PORT;
const DBHOST = process.env.DBHOST;
const DBNAME = process.env.DBNAME;
const RABBIT = process.env.RABBIT;

// applciation entry point

async function main() {
    const app = express();

    // enables JSON body parsing for HTTP requests
    app.use(express.json());

    // connects to the database server
    const client = await mongodb.MongoClient.connect(DBHOST)

    // gets the database for this microservice
    const db = client.db(DBNAME)

    // gets the collections for storing video metadata
    const videosCollections = db.collection("videos");

    // Connect to the RabbitMQ server
    const messagingConnection = await amqp.connect(RABBIT);

    // creates a RabbitMQ messaging channel
    const messageChannel = await messagingConnection.createChannel();

    // Handler for incoming messages
    async function consumeViewedMessages(msg) {
        const parsedMsg = JSON.parse(msg.content.toString()); // parse the JSON message

        console.log("Recommendations recieved a 'viewed' message");
        console.log(JSON.stringify(parsedMsg, null, 4)) // JUST PRINTING THE RECIEVED MESSAGE

        // ADD CODE TO PROCESS MESSAGE
        // await videosCollections.insertOne({ video: "test" }) // Recordss the "view" in the database

        console.log("Acknowledging message was handled.");

        messageChannel.ack(msg); // if there is no error, acknowledge the message
    };

    // asserts that we have a "viewed" exchange
    await messageChannel.assertExchange("viewed", "fanout");

    // creates an anonymous queue
    const { queue } = await messageChannel.assertQueue("", { exclusive: true });

    console.log(`Created queue ${queue}, binding it to "viewed" exchange`)

    // binds the queue to the exchange
    await messageChannel.bindQueue(queue, "viewed", "");

    // start recieving messages from the anonymous queue
    await messageChannel.consume(queue, consumeViewedMessages);

    // starts the HTTP server.
    app.listen(PORT, () => {
        console.log("Microservice online.");
    });
}

main()
    .catch(err => {
        console.error("Microservice failed to start.");
        console.error(err && err.stack || err);
    });