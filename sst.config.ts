/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "sparrow-tags",
      removal: input?.stage === "prod" ? "retain" : "remove",
      protect: ["prod"].includes(input?.stage),
      home: "aws",
      node: "22",
    };
  },
  async run() {
    const { userPool, userPoolClient } = await import("./infra/auth");
    await import("./infra/vpc");
    const { database } = await import("./infra/database");
    await import("./infra/backend");
    await import("./infra/frontend");
    return {
      COGNITO_USER_POOL_ID: userPool.id,
      COGNITO_CLIENT_ID: userPoolClient.id,
      DATABASE_NAME: database.database,
      DATABASE_HOST: database.host,
      DATABASE_PORT: database.port.apply((port) => port.toString()),
      DATABASE_USER: database.username,
      DATABASE_PASSWORD: database.password,
    };
  },
});
