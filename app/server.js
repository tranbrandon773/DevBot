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

const messageForNewPRs = "Thanks for opening a new PR! Please follow our contributing guidelines to make your PR easier to review.";

async function handlePullRequestOpened({octokit, payload}) {
  console.log(`Received a pull request event for #${payload.pull_request.number}`);

  try {
    await octokit.request("POST /repos/{owner}/{repo}/issues/{issue_number}/comments", {
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      issue_number: payload.pull_request.number,
      body: messageForNewPRs,
      headers: {
        "x-github-api-version": "2022-11-28",
      },
    });
  } catch (error) {
    if (error.response) {
      console.error(`Error! Status: ${error.response.status}. Message: ${error.response.data.message}`)
    }
    console.error(error)
  }
};

// This sets up a webhook event listener. When your app receives a webhook event from GitHub with a `X-GitHub-Event` header value of `pull_request` and an `action` payload value of `opened`, it calls the `handlePullRequestOpened` event handler that is defined above.
app.webhooks.on("pull_request.opened", handlePullRequestOpened);

// This logs any errors that occur.
app.webhooks.onError((error) => {
  if (error.name === "AggregateError") {
    console.error(`Error processing request: ${error.event}`);
  } else {
    console.error(error);
  }
});

const port = process.env.PORT || 3000;
// const host = "brandonbuildbot-94131d1b6ce7.herokuapp.com";
const path = "/api/webhook";
// const localWebhookUrl = `https://${host}:${port}${path}`;

const middleware = createNodeMiddleware(app.webhooks, {path});

const server = express();

server.use(path, middleware);

server.get("/", (req, res) => {
  res.send("Hello World!")
})

server.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});