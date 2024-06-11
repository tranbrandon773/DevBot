import dotenv from "dotenv";
import {App} from "octokit";
import {createNodeMiddleware} from "@octokit/webhooks";
import fs from "fs";
import express from 'express';
import {getWorkflowLogs, getFileContent, parseWorkflowLog, findFilesFromErrors, runShell, runShellPost} from './helper.js';

dotenv.config();

const appId = process.env.APP_ID;
const webhookSecret = process.env.WEBHOOK_SECRET;
const privateKeyPath = process.env.PRIVATE_KEY_PATH;

const privateKey = fs.readFileSync(privateKeyPath, "utf8");

const app = new App({
  appId: appId,
  privateKey: privateKey,
  webhooks: {
    secret: webhookSecret
  },
});

// Listens for workflow runs that failed, specifically for PRs
async function handleWorkflowRunCompleted({octokit, payload}) {

  if (payload.action !== "completed" || 
  payload.workflow_run.conclusion !== "failure" || 
  payload.workflow_run.pull_requests.length === 0) return;

  const logUrl = await getWorkflowLogs(octokit, payload);
  runShell(logUrl, "temp");
  const errors = parseWorkflowLog(`./temp/0_build.txt`);
  const mappedErrors = findFilesFromErrors(errors);

  runShellPost("temp");

  mappedErrors.forEach((file) => {
    const headRef = payload.workflow_run.pull_requests[0].head.ref; //PR branch
    const baseRef = payload.workflow_run.pull_requests[0].base.ref; //main branch
    const oldCode = getFileContent(octokit, payload, file.file_name, baseRef);
    const newCode = getFileContent(octokit, payload, file.file_name, headRef);
    file.oldCode = oldCode;
    file.newCode = newCode;
  });

  console.log(mappedErrors)
};

// Event listener for GitHub webhooks when workflow runs complete
app.webhooks.on("workflow_run.completed", handleWorkflowRunCompleted);

app.webhooks.onError((error) => {
  if (error.name === "AggregateError") {
    console.error(`Error processing request: ${error.event}`);
  } else {
    console.error(error);
  }
});

const port = process.env.PORT || 3000;
const path = "/api/webhook";
const middleware = createNodeMiddleware(app.webhooks, {path});
const server = express();
server.use(middleware);

server.get("/", (_, res) => {
  res.send("Homepage for BrandonBuildBot API")
})

server.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});