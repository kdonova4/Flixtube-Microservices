const express = require("express");
const fs = require("fs");
const http = require("http");
const amqp = require('amqplib');

if (!process.env.PORT) {
    throw new Error("Please specify the port number for the HTTP server with the environment variable PORT.");
}

if (!process.env.RABBIT) {
    throw new Error("Please specify the name of the RabbitMQ host using environment variable RABBIT");
}

const PORT = process.env.PORT;
const RABBIT = process.env.RABBIT;


//
// Application entry point.
//
async function main() {
    
    console.log(`Connecting to RabbitMQ server at ${RABBIT}`);

    const messagingConnection = await amqp.connect(RABBIT); // connects to the RabbitMQ server

    console.log("Connected to RabbitMQ");

    const messageChannel = await messagingConnection.createChannel(); // Creates a RabbitMq messaging channel

    await messageChannel.assertExchange("viewed", "fanout"); // asserts that we have a "viewed" exchange

    // Send the "viewed" to the history microservice
    function broadcastViewedMessage(messageChannel, videoPath) {
        console.log("Publishing message on 'viewed' queue");

        const msg = { videoPath: videoPath };
        const jsonMsg = JSON.stringify(msg);
        messageChannel.publish("viewed", "", Buffer.from(jsonMsg)) // publishes message to the 'viewed' exchange
    }

    const app = express();

    app.get("/video", async (req, res) => {
        const videoPath = "./videos/loveland_td.mp4";
        const stats = await fs.promises.stat(videoPath);

        res.writeHead(200, {
            "Content-Length": stats.size,
            "Content-Type": "video/mp4",
        });

        fs.createReadStream(videoPath).pipe(res);

        broadcastViewedMessage(messageChannel, videoPath)
    });



    app.listen(PORT, () => {
        console.log("Microservice online.");
    });
}

main()
    .catch(err => {
        console.error("Microservice failed to start.");
        console.error(err && err.stack || err);
    });