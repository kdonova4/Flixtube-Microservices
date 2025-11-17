const express = require("express");
const mongodb = require("mongodb");
const amqp = require('amqplib')

if (!process.env.PORT) {
    throw new Error("Please specify the port number for the HTTP server with the environment variable PORT.");
}

if (!process.env.DBHOST) {
    throw new Error("Please specify the database host using environment variable DBHOST.");
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


// main entry point
async function main() {
    
    const app = express();

    
    // enables JSON body parsing for HTTP requests
    app.use(express.json());


    // connects to database server
    const client = await mongodb.MongoClient.connect(DBHOST);


    // gets the database for this microservice
    const db = client.db(DBNAME);


    // gets the collection for storing video viewing history
    const historyCollection = db.collection("history");


    // connects to the RabbitMQ server
    const messagingConnection = await amqp.connect(RABBIT);

    console.log("Connected to RabbitMQ")


    // creates a RabbitMQ messaging channel
    const messageChannel = await messagingConnection.createChannel();


    // asserts that we have a viewed queue
    await messageChannel.assertExchange("viewed", "fanout");


	// Creates an anonyous queue.
	const { queue } = await messageChannel.assertQueue("", { exclusive: true }); 

    console.log(`Created queue ${queue}, binding it to "viewed" exchange.`);


    // binds the queue to the exchange
    await messageChannel.bindQueue(queue, "viewed", "");


    // Start recieving messages from the "viewed" queue
    await messageChannel.consume(queue, async (msg) => {
        console.log("Recieved a 'viewed' message");

        const parsedMsg = JSON.parse(msg.content.toString()); // Parse the JSON message

        await historyCollection.insertOne({ videoPath: parsedMsg.videoPath }) // Recordss the "view" in the database

        console.log("Acknowledging message was handled");

        messageChannel.ack(msg); // If there is no error, acknowledge the message
    })

    app.get("/history", async (req, res) => {
        const skip = parseInt(req.query.skip);
        const limit = parseInt(req.query.limit);
        const history = await historyCollection.find()
        .skip(skip)
        .limit(limit)
        .toArray();
        res.json({ history });
    });

    app.listen(PORT, () => {
        console.log("Microserevice online.")
    });
}

main()
.catch(err => {
    console.error("Microservice failed to start")
    console.error(err && err.stack || err);
})