import { DefaultAzureCredential } from "@azure/identity";
import { BlobServiceClient } from "@azure/storage-blob";

const storageAccount = process.env.STORAGE_ACCOUNT_NAME;
const containerName = process.env.CONTAINER_NAME;

if (!storageAccount || !containerName) {
  throw new Error("STORAGE_ACCOUNT_NAME and CONTAINER_NAME are required");
}

const credential = new DefaultAzureCredential();
const serviceClient = new BlobServiceClient(
  `https://${storageAccount}.blob.core.windows.net`,
  credential,
);
const containerClient = serviceClient.getContainerClient(containerName);

await containerClient.createIfNotExists();

const blobName = "node-identity-proof.txt";
const content = "Node.js accessed Blob Storage using AKS Workload Identity.\n";
const blobClient = containerClient.getBlockBlobClient(blobName);

await blobClient.uploadData(Buffer.from(content), {
  blobHTTPHeaders: { blobContentType: "text/plain" },
});

console.log(`Uploaded ${blobName}. Blobs in ${containerName}:`);
for await (const blob of containerClient.listBlobsFlat()) {
  console.log(`- ${blob.name}`);
}

const downloaded = await blobClient.downloadToBuffer();
console.log(`Downloaded content: ${downloaded.toString()}`);