import dotenv from "dotenv";
import {App} from "octokit";
import {createNodeMiddleware} from "@octokit/webhooks";
import fs from "fs";
import express from 'express';
import {getWorkflowLogs, runShell, runShellPost, parseWorkflowLogForErrors, mapErrorsToFiles, fetchCodeForFiles} from './helper.js';
import {generateFixesForErrors, suggestFixesOnPr} from "./openai.js";
import {createTreeForFixes, createCommitForNewTree, updateRefToPointToNewCommit} from "./createTreeCommitRef.js";
import {getFilesChangedFromPullRequest, fetchFileContent} from "./prbuddy.js";

// Initialize environment variables and octokit app
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

// Handles events from workflow run completion event listener
async function handleWorkflowRunCompleted({octokit, payload}) {
  if (payload.action !== "completed" || 
      payload.workflow_run.conclusion !== "failure" || 
      payload.workflow_run.pull_requests.length === 0) return;

  const logUrl = await getWorkflowLogs(octokit, payload);
  runShell(logUrl, "temp");
  const errors = parseWorkflowLogForErrors(`./temp/0_build.txt`);
  const mappedErrors = mapErrorsToFiles(errors);
  runShellPost("temp");
  const codeForFiles = await fetchCodeForFiles(octokit, payload, mappedErrors);
  const fixesForFiles = await generateFixesForErrors(mappedErrors, codeForFiles);
  await suggestFixesOnPr(octokit, payload, fixesForFiles);
};

// Event listener for GitHub webhooks when workflow runs complete
// app.webhooks.on("workflow_run.completed", handleWorkflowRunCompleted);

// Handles event from comment posted event listener
async function handleCommentPosted({octokit, payload}) {
  if (payload.action !== "created" ||
      !payload.issue.pull_request ||
      payload.comment.body !== "/prbuddy") return;
  const filesChanged = await getFilesChangedFromPullRequest(octokit, payload);
  const codeForFiles = await fetchFileContent(filesChanged);
  console.log(codeForFiles);
}

// Event listener for GitHub webhooks when comment posts
app.webhooks.on("issue_comment.created", handleCommentPosted);

app.webhooks.onError((error) => {
  if (error.name === "AggregateError") {
    console.error(`Error processing request: ${error.event}`);
  } else {
    console.error(error);
  }
});

// Express server logic
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