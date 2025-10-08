import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

const endpoint = process.env.S3_ENDPOINT ?? "http://localhost:9000";
const bucket = process.env.S3_BUCKET ?? "enfy";

const client = new S3Client({
  region: "us-east-1",
  endpoint,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY ?? "minioadmin",
    secretAccessKey: process.env.S3_SECRET_KEY ?? "minioadmin"
  }
});

export async function uploadBuffer(buffer: Buffer, mimeType: string) {
  const key = `audio/${new Date().toISOString().slice(0, 10)}/${randomUUID()}`;

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType
    })
  );

  const normalizedEndpoint = endpoint.endsWith("/")
    ? endpoint.slice(0, -1)
    : endpoint;

  return {
    key,
    url: `${normalizedEndpoint}/${bucket}/${key}`
  };
}
