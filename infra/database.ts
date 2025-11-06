import { vpc } from "./vpc";

export const databasePassword = new sst.Secret("DatabasePassword");

export const database = new sst.aws.Postgres("Database", {
  vpc,
  instance: "t4g.micro",
  version: "17.2",
  password: databasePassword.value,
  dev: {
    username: "postgres",
    password: "postgres",
    database: "postgres",
    port: 54321,
    host: "localhost",
  },
});
