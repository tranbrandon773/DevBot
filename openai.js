import OpenAI from "openai";
import dotenv from "dotenv";
import {fetchLatestCommitSha} from "./createTreeCommitRef.js"

dotenv.config();

/*
  Generates code fix for each error in mappedErrors then comments the fix as a suggestion on the pull request
  @param mappedErrors: An array of objects with properties file_path, line, error_desc
  @param codeForFiles: An object with keys of file_path and values of content
  @param latestCommitSha: Sha of most recent commit of pull request to anchor suggestion to
  @returns An array of objects with properties file_path, line, code_fix
*/
export async function generateFixesForErrors(mappedErrors, codeForFiles) {
  const key = process.env.OPENAI_API_KEY;
  const openai = new OpenAI({
      apiKey: key
  });
  let res = [];
  try {
    for (const err of mappedErrors) {
      const completion = await openai.chat.completions.create({
        messages: [{ role: "system", content: "Attached is an instruction that describes a task. Write a response that appropriately completes the request. You are a senior software engineer reviewing a pull request from a team member. You are given the code of a file along with the error that occurred on a specific line. Please fix only the error on the given line. You should prioritize removing code rather than commenting it out. Output only the fix for that line without the rest of the code in a GitHub suggestin markdown. You should briefly explain your fix in a conversational tone for your team members to understand and learn from. Make sure you wrap your entire output in a different style of quotes to prevent parsing errors."},
                    {role: "user", content: `Code: ${codeForFiles[err.file_path]} Error: ${err.error_desc}`}
        ],
        model: "gpt-4o",
      });
      const codeFix = completion.choices[0].message.content;
      res.push({
        "file_path": err.file_path,
        "line": err.line,
        "code_fix": codeFix
      });
    };
  } catch (error) {
    if (error.response) { 
        console.error(`Error! Status: ${error.response.status}. Message: ${error.response.data.message}`);
    }
    console.error(error);
  }
  return res;
}

/*
  Comments code fixes as suggestions with explanations for each error
  @param octokit: App that abstracts GitHub API requests
  @param payload: The response object from GitHub webhook events
  @param fixesForFiles: An array of objects with properties file_path, line, and code_fix
  @returns Void
*/
export async function suggestFixesOnPr(octokit, payload, fixesForFiles) {
  const latestCommitSha = await fetchLatestCommitSha(octokit, payload);
  console.log(`Latest commit Sha: ${latestCommitSha}`);
  for (const fix of fixesForFiles) {
    try {
      await octokit.request('POST /repos/{owner}/{repo}/pulls/{pull_number}/comments', {
        owner: payload.repository.owner.login,
        repo: payload.repository.name,
        pull_number: payload.workflow_run.pull_requests[0].number,
        body: fix.code_fix,
        commit_id: latestCommitSha,
        path: fix.file_path,
        line: fix.line,
        headers: {
          'X-GitHub-Api-Version': '2022-11-28'
        }
      });
    } catch (error) {
      if (error.response) { 
          console.error(`Error! Status: ${error.response.status}. Message: ${error.response.data.message}`);
      }
      console.error(error);
    }
  }
}
