import dotenv from "dotenv";
import {App} from "octokit";
import {createNodeMiddleware} from "@octokit/webhooks";
import fs from "fs";
import express from 'express';
import {getWorkflowLogs, getFileContent, parseWorkflowLog, findFilesFromErrors} from './helper.js';

import {runShell} from './runScript.js';

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

  const owner =  payload.repository.owner.login;
  const repo =  payload.repository.name;
  const runId = payload.workflow_run.id;
  const headRef = payload.workflow_run.pull_requests[0].head.ref; //PR branch
  const baseRef = payload.workflow_run.pull_requests[0].base.ref; //main branch
  console.log(`Received a (failed) workflow run event for #${runId}`);

  const logUrl = await getWorkflowLogs(octokit, owner, repo, runId);
  
  // runShell("https://github.com/gw31415/math2img/archive/refs/tags/v0.1.9.zip", "dummy");
  // const errors = parseWorkflowLog(logUrl);
  // console.log(errors);
  // const mappedErrors = findFilesFromErrors(errors);
  // console.log(mappedErrors)
  // mappedErrors[0].name

  const oldCode = await getFileContent(octokit, owner, repo, 'main.py', baseRef);
  const newCode = await getFileContent(octokit, owner, repo, 'main.py', headRef);
  console.log(`Log URL: ${logUrl}`)
  console.log(`Old Code: ${oldCode}`);
  console.log(`New Code: ${newCode}`);
  console.log(log)
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