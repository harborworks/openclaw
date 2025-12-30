import { backendUrl } from "./urls";

export const tasks = new sst.aws.Bucket("Tasks");

tasks.notify({
  notifications: [
    {
      name: "CreateTasks",
      filterPrefix: "orgs",
      events: ["s3:ObjectCreated:*"],
      function: {
        runtime: "nodejs22.x",
        link: [tasks],
        handler: "packages/functions/src/createTasks.handler",
        timeout: "5 minutes",
        memory: "3008 MB",
        environment: {
          API_URL: backendUrl,
        },
      },
    },
  ],
});
