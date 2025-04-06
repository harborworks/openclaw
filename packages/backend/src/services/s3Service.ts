import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import config from "../config";

const s3Client = new S3Client({
  region: config.cognitoRegion,
});

export const generatePresignedUrl = async (
  orgId: number,
  jobId: number,
  fileName: string
): Promise<string> => {
  const key = `orgs/${orgId}/jobs/${jobId}/${fileName}`;

  const command = new PutObjectCommand({
    Bucket: config.tasksBucketName,
    Key: key,
    ContentType: "application/x-jsonlines",
  });

  return getSignedUrl(s3Client, command, { expiresIn: 3600 }); // URL expires in 1 hour
};
