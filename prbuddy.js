import axios from 'axios';
import OpenAI from "openai";
/*
    1. Someone comments /prbuddy on a PR // done
    2. Get info on PR // from the payload
    3. Get files changed from PR // needs to implemented
    4. Get content of each file // modify func from helper.js
    5. Run inferencing to optimize code // tbd
    6. Commit changes/suggest it // tbd
    Webhook Documentation: https://docs.github.com/en/webhooks/webhook-events-and-payloads#issue_comment
    API Documentation: https://docs.github.com/en/rest/pulls/pulls?apiVersion=2022-11-28#update-a-pull-request

    - payload.issue.pull_request contains info of PR
        - PR has properties diff_url, html_url, merged_at, patch_url (string), url; how to get info on PR given url?
    - payload.repository contains info on repository (owner, repo, etc); used to make requests via gh api
*/
/*
    Payload Structure
    {
  "action": "created",
  "issue": {
    "url": "https://api.github.com/repos/tranbrandon773/test/issues/65",
    "repository_url": "https://api.github.com/repos/tranbrandon773/test",
    "labels_url": "https://api.github.com/repos/tranbrandon773/test/issues/65/labels{/name}",
    "comments_url": "https://api.github.com/repos/tranbrandon773/test/issues/65/comments",
    "events_url": "https://api.github.com/repos/tranbrandon773/test/issues/65/events",
    "html_url": "https://github.com/tranbrandon773/test/pull/65",
    "id": 2367137546,
    "node_id": "PR_kwDOMAn83s5zN5Np",
    "number": 65, 
    "title": "Update main.py",
    "labels": [],
    "state": "open",
    "locked": false,
    "assignee": null,
    "assignees": [],
    "milestone": null,
    "comments": 2,
    "created_at": "2024-06-21T19:33:41Z",
    "updated_at": "2024-06-22T18:16:38Z",
    "closed_at": null,
    "author_association": "OWNER",
    "active_lock_reason": null,
    "draft": false,
    "pull_request": {
      "url": "https://api.github.com/repos/tranbrandon773/test/pulls/65",
      "html_url": "https://github.com/tranbrandon773/test/pull/65",
      "diff_url": "https://github.com/tranbrandon773/test/pull/65.diff",
      "patch_url": "https://github.com/tranbrandon773/test/pull/65.patch",
      "merged_at": null
    },
    "body": null,
    "timeline_url": "https://api.github.com/repos/tranbrandon773/test/issues/65/timeline",
    "performed_via_github_app": null,
    "state_reason": null
  },
  "repository": {
    "id": 805960926,
    "node_id": "R_kgDOMAn83g",
    "name": "test",
    "full_name": "tranbrandon773/test",
    "private": true,
    "owner": {
      "login": "tranbrandon773",
      "id": 21091311,
      "node_id": "MDQ6VXNlcjIxMDkxMzEx",
      "avatar_url": "https://avatars.githubusercontent.com/u/21091311?v=4",
      "gravatar_id": "",
      "url": "https://api.github.com/users/tranbrandon773",
      "html_url": "https://github.com/tranbrandon773",
      "followers_url": "https://api.github.com/users/tranbrandon773/followers",
      "following_url": "https://api.github.com/users/tranbrandon773/following{/other_user}",
      "gists_url": "https://api.github.com/users/tranbrandon773/gists{/gist_id}",
      "starred_url": "https://api.github.com/users/tranbrandon773/starred{/owner}{/repo}",
      "subscriptions_url": "https://api.github.com/users/tranbrandon773/subscriptions",
      "organizations_url": "https://api.github.com/users/tranbrandon773/orgs",
      "repos_url": "https://api.github.com/users/tranbrandon773/repos",
      "events_url": "https://api.github.com/users/tranbrandon773/events{/privacy}",
      "received_events_url": "https://api.github.com/users/tranbrandon773/received_events",
      "type": "User",
      "site_admin": false
    }
*/
/*
[
  {
    "sha": "a72d650bda0dd88507fd9d8fb4130cf7baba1ae1",
    "filename": "main.py",
    "status": "modified",
    "additions": 3,
    "deletions": 1,
    "changes": 4,
    "blob_url": "https://github.com/tranbrandon773/test/blob/275252f586e7d34767da331f52d78611b0d58153/main.py",
    "raw_url": "https://github.com/tranbrandon773/test/raw/275252f586e7d34767da331f52d78611b0d58153/main.py",
    "contents_url": "https://api.github.com/repos/tranbrandon773/test/contents/main.py?ref=275252f586e7d34767da331f52d78611b0d58153",
    "patch": "@@ -1,3 +1,5 @@\n+import numpy\n+\n '''\n Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n You may assume that each input would have exactly one solution, and you may not use the same element twice.\n@@ -36,4 +38,4 @@ def twoSum(nums, target):\n             if i == j: \n                 continue\n             if nums[i] + nums[j] == target: \n-                return i, j\n\\ No newline at end of file\n+                return i, j"
  }
]
*/

/*
    Gets files changed from a pull request
    @param octokit: App that abstracts GitHub API requests
    @param payload: The response object from GitHub webhook events
    @returns An array of objects with (important) properties filename, status, contents_url
*/
export async function getFilesChangedFromPullRequest(octokit, payload) {
    let filesChanged;
    try {
        const res = await octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}/files', {
            owner: payload.repository.owner.login,
            repo: payload.repository.name,
            pull_number: payload.issue.number,
            headers: {
                'X-GitHub-Api-Version': '2022-11-28'
            }
            });
        filesChanged = res.data;
    } catch (error) {
        if (error.response) { 
            console.error(`Error! Status: ${error.response.status}. Message: ${error.response.data.message}`)
        }
        console.error(error);
    }
    return filesChanged;
}

/*
    Fetches the code for every file in filesChanged
    @param octokit: App that abstracts GitHub API requests
    @param filesChanged: An array of objects with (important) properties filename, status, contents_url
    @returns An object with keys of file_path and values of content
*/
export async function fetchCodeForFilesChanged(octokit, filesChanged) {
    /*
    Fetches the file content for a file of a given repository and branch
    @param octokit: App that abstracts GitHub API requests
    @param contentsUrl: URL to contents of the file
    @returns The content of the specified file
    */
    async function getFileContent(octokit, contentsUrl) {
        let downloadUrl;
        // Helper function to retrieve content using axios
        const fetchContent = async (url) => {
            try {
                const response = await axios.get(url);
                console.log("Successfully fetched content of file from download URL!");
                return response.data;
            } catch (error) {
                console.error(`Failed to fetch content from ${url}. Error: ${error.message}`);
                throw error;
            }
        }
        try {
            const res = await octokit.request(`GET ${contentsUrl}`, {
                headers: {
                    'X-GitHub-Api-Version': '2022-11-28'
                }
            });
            downloadUrl = res.data.download_url;
            console.log("Successfully fetched download URL for file!");
        } catch (error) {
            if (error.response) { 
                console.error(`Error! Status: ${error.response.status}. Message: ${error.response.data.message}`);
            }
            console.error(error);
            return null;
        }
        
        if (downloadUrl) {
            try {
                const content = await fetchContent(downloadUrl);
                return content;
            } catch (error) {
                console.error('Error fetching file content:', error);
                return null;
            }
        } else {
            return null;
        }
    }
    let res = {};
    for (const file of filesChanged) {
        const content = await getFileContent(octokit, file.contents_url);
        res[file.filename] = content;
    }
    return res;
}

/*
    Generate suggestions for each file changed
    @param filesChanged: An array of objects with properties sha, filename, status, raw_url
    @param codeForFilesChanged: An object with keys of file_name and values of content
    @returns An array of objects with properties file_name and code_suggestion
*/
export async function generateSuggestionsForFiles(filesChanged, codeForFilesChanged) {
    const key = process.env.OPENAI_API_KEY;
    const openai = new OpenAI({
        apiKey: key
    });
    let res = [];
    try {
      for (const file of filesChanged) {
        const completion = await openai.chat.completions.create({
          messages: [{ role: "system", content: "Blablabla"},
                      {role: "user", content: `Name: ${file.filename} Code: ${codeForFilesChanged[file.filename]}`}
          ],
          model: "gpt-4o",
        });
        const codeFix = completion.choices[0].message.content;
        res.push({
          "file_name": err.file_path,
          "code_suggestion": codeFix
        });
      }
      console.log("Successfully generated fixes for errors!");
    } catch (error) {
      if (error.response) { 
          console.error(`Error! Status: ${error.response.status}. Message: ${error.response.data.message}`);
      }
      console.error(error);
    }
    return res;
}