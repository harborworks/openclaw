import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { S3Event } from "aws-lambda";
import axios from "axios";
import { createInterface } from "readline";
import { Readable } from "stream";

const s3Client = new S3Client({});

// Configure axios to use the API URL from environment
const api = axios.create({
  baseURL: process.env.API_URL,
  timeout: 30000, // 30 second timeout
});

interface TaskData {
  url: string;
  [key: string]: any;
}

interface TaskCreationError {
  task: TaskData;
  error: any;
}

export const handler = async (event: S3Event) => {
  try {
    // Extract bucket and key from the S3 event
    const bucket = event.Records?.[0]?.s3?.bucket?.name;
    const key = decodeURIComponent(
      event.Records?.[0]?.s3?.object?.key?.replace(/\+/g, " ") ?? ""
    );

    if (!bucket || !key) {
      throw new Error("Missing bucket or key in S3 event");
    }

    // Extract jobId from the key path (format: orgs/{orgId}/jobs/{jobId}/tasks.jsonl)
    const jobIdMatch = key.match(/\/jobs\/(\d+)\//);
    if (!jobIdMatch) {
      throw new Error("Could not extract jobId from key");
    }
    const jobId = parseInt(jobIdMatch[1]);

    // Get the object from S3
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const response = await s3Client.send(command);
    if (!response.Body) {
      throw new Error("No body in S3 response");
    }

    // Process the JSONL file line by line
    const stream = response.Body as Readable;
    const rl = createInterface({
      input: stream,
      crlfDelay: Infinity,
    });

    const tasks: TaskData[] = [];
    const errors: TaskCreationError[] = [];
    let processedCount = 0;

    for await (const line of rl) {
      try {
        const taskData = JSON.parse(line) as TaskData;
        if (!taskData.url) {
          console.warn("Skipping task without URL:", line);
          continue;
        }
        tasks.push(taskData);
      } catch (error) {
        console.error("Error parsing line:", line, error);
        errors.push({ task: { url: "unknown", raw: line }, error });
      }
    }

    // Create tasks in batches of 100
    const BATCH_SIZE = 100;
    for (let i = 0; i < tasks.length; i += BATCH_SIZE) {
      const batch = tasks.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map((task) =>
          api.post(`/api/jobs/${jobId}/tasks`, {
            url: task.url,
          })
        )
      );

      // Process results
      results.forEach((result, index) => {
        const task = batch[index];
        if (result.status === "fulfilled") {
          processedCount++;
        } else {
          errors.push({
            task,
            error: result.reason,
          });
        }
      });

      console.log(`Processed batch ${i / BATCH_SIZE + 1}`);
    }

    return {
      statusCode: errors.length === 0 ? 200 : 207, // 207 Multi-Status if there were some errors
      body: JSON.stringify({
        message: `Processed ${processedCount} tasks successfully`,
        totalTasks: tasks.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
    };
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};
