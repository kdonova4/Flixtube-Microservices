const express = require('express');
const fs = require('fs');

const app = express();


if(!process.env.PORT) {
    throw new Error("Please specify the port number for the HTTP sever with the environment variable PORT.")
}

const PORT = process.env.PORT;

app.get('/video', async (req, res) => {
    const videoPath = "./videos/loveland.mp4";
    const stats = await fs.promises.stat(videoPath);

    res.writeHead(200, {
        "content-length": stats.size,
        "Content-Type": "video/mp4",
    });
    fs.createReadStream(videoPath).pipe(res);
});

app.listen(PORT, () => {
    console.log(`App is listening on port #${PORT}`)
});