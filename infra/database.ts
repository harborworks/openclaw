import { vpc } from "./vpc";

export const database = new sst.aws.Postgres("Database", {
  vpc,
  instance: "t4g.micro",
  version: "17.2",
  dev: {
    username: "postgres",
    password: "postgres",
    database: "postgres",
    port: 54321,
    host: "localhost",
  },
});
