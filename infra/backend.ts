import { userPool, userPoolClient } from "./auth";
import { database } from "./database";
import { bucket } from "./storage";
import { backendUrl } from "./urls";

import { vpc } from "./vpc";

export const cluster = new sst.aws.Cluster("Cluster", {
  vpc,
});

export const service = new sst.aws.Service("Backend", {
  cluster,
  loadBalancer: {
    domain: backendUrl.replace("https://", ""),
    rules: [
      { listen: "443/https", forward: "3000/http" },
      { listen: "80/http", forward: "3000/http" },
    ],
  },
  link: [database],
  dev: {
    directory: "packages/backend",
    command: "npm run dev",
    url: backendUrl,
  },
  environment: {
    AWS_REGION: "us-east-1",
    COGNITO_USER_POOL_ID: userPool.id,
    COGNITO_CLIENT_ID: userPoolClient.id,
    DATABASE_NAME: database.database,
    DATABASE_HOST: database.host,
    DATABASE_PORT: database.port.apply((port) => port.toString()),
    DATABASE_USER: database.username,
    DATABASE_PASSWORD: database.password,
    BUCKET_NAME: bucket.name,
  },
});
