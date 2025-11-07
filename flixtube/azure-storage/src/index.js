const express = require("express");
const { BlobServiceClient, StorageSharedKeyCredential }
    = require("@azure/storage-blob");

const PORT = process.env.PORT;
const STORAGE_ACCOUNT_NAME = process.env.STORAGE_ACCOUNT_NAME;
const STORAGE_ACCESS_KEY = process.env.STORAGE_ACCESS_KEY;

function createBlobService() {
    const sharedKeyCredential = new StorageSharedKeyCredential(
        STORAGE_ACCOUNT_NAME, STORAGE_ACCESS_KEY
    );

    const blobService = new BlobServiceClient(
        `https://${STORAGE_ACCOUNT_NAME}.blob.core.windows.net`,
        sharedKeyCredential
    );

    return blobService;
}

const app = express();

app.get("/video", async (req, res) => {
    const videoPath = req.query.path;

    const containerName = "videos";
    const blobService = createBlobService();
    const containerClient = blobService.getContainerClient(containerName);
    const blobClient = containerClient.getBlobClient(videoPath);

    const properties = await blobClient.getProperties();

    res.writeHead(200, {
        "content-length": properties.contentLength,
        "content-type": "video/mp4",
    });

    const response = await blobClient.download();
    response.readableStreamBody.pipe(res);
})

app.listen(PORT);