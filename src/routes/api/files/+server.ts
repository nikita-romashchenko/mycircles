import { S3Client, ListObjectsV2Command  } from "@aws-sdk/client-s3";
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


export const GET: RequestHandler = async () => {
  const bucket = env.AWS_BUCKET || "uploads";

  const result = await s3.send(
    new ListObjectsV2Command({ Bucket: bucket })
  );

  const files = (result.Contents || []).map((obj) => ({
    key: obj.Key,
    url: `${env.MINIO_ENDPOINT}/${bucket}/${obj.Key}`,
  }));

  return new Response(JSON.stringify(files), {
    headers: { "Content-Type": "application/json" },
  });
};
