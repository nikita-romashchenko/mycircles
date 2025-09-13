import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import type { RequestHandler } from './$types';
import { env } from "$env/dynamic/private"


const s3 = new S3Client({
  endpoint: env.MINIO_ENDPOINT,
  region: env.AWS_REGION,
  forcePathStyle: true, // required for MinIO
  credentials: {
    accessKeyId: env.MINIO_ACCESS_KEY_ID,
    secretAccessKey: env.MINIO_SECRET_ACCESS_KEY,
  },
});


export const POST: RequestHandler = async ({ request }) => {
  const formData = await request.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return new Response(JSON.stringify({ error: "No file uploaded" }), { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const uploadParams = {
    Bucket: env.MINIO_BUCKET || "uploads",
    Key: file.name,
    Body: buffer,
    ContentType: file.type,
  };

  await s3.send(new PutObjectCommand(uploadParams));

  return new Response(JSON.stringify({ url: `${env.MINIO_ENDPOINT}/${uploadParams.Bucket}/${file.name}` }));
};
