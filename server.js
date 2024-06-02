import dotenv from "dotenv";
import {App} from "octokit";
import {createNodeMiddleware} from "@octokit/webhooks";
import fs from "fs";
import express from 'express';

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

const messageForNewPRs = "Hello World!";

async function handleWorkflowRunCompleted({octokit, payload}) {

  if (payload.action !== "completed" || payload.workflow_run.conclusion !== "failure") return

  console.log(`Received a (failed) workflow run event for #${payload.workflow_run.id}`);

  try {
    const res = await octokit.request('GET /repos/{owner}/{repo}/actions/runs/{run_id}/logs', {
      owner: 'OWNER',
      repo: 'REPO',
      run_id: 'RUN_ID',
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });
    console.log(`Workflow run log can be found at: ${res.Location}`);
  } catch (error) {
    if (error.response) {
      console.error(`Error! Status: ${error.response.status}. Message: ${error.response.data.message}`)
    }
    console.error(error)
  }
};

// This sets up a webhook event listener. When your app receives a webhook event from GitHub with a `X-GitHub-Event` header value of `pull_request` and an `action` payload value of `opened`, it calls the `handlePullRequestOpened` event handler that is defined above.
app.webhooks.on("workflow_run.completed", handleWorkflowRunCompleted);

// This logs any errors that occur.
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
server.use( middleware);

server.get("/", (req, res) => {
  res.send("Homepage for BrandonBuildBot API")
})

server.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});