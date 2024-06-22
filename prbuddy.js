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
    "sha": "bbcd538c8e72b8c175046e27cc8f907076331401",
    "filename": "file1.txt",
    "status": "added",
    "additions": 103,
    "deletions": 21,
    "changes": 124,
    "blob_url": "https://github.com/octocat/Hello-World/blob/6dcb09b5b57875f334f61aebed695e2e4193db5e/file1.txt",
    "raw_url": "https://github.com/octocat/Hello-World/raw/6dcb09b5b57875f334f61aebed695e2e4193db5e/file1.txt",
    "contents_url": "https://api.github.com/repos/octocat/Hello-World/contents/file1.txt?ref=6dcb09b5b57875f334f61aebed695e2e4193db5e",
    "patch": "@@ -132,7 +132,7 @@ module Test @@ -1000,7 +1000,7 @@ module Test"
  },
   {
    "sha": "bbcd538c8e72b8c175046e27cc8f907076331401",
    "filename": "file2.txt",
    "status": "added",
    "additions": 103,
    "deletions": 21,
    "changes": 124,
    "blob_url": "https://github.com/octocat/Hello-World/blob/6dcb09b5b57875f334f61aebed695e2e4193db5e/file1.txt",
    "raw_url": "https://github.com/octocat/Hello-World/raw/6dcb09b5b57875f334f61aebed695e2e4193db5e/file1.txt",
    "contents_url": "https://api.github.com/repos/octocat/Hello-World/contents/file1.txt?ref=6dcb09b5b57875f334f61aebed695e2e4193db5e",
    "patch": "@@ -132,7 +132,7 @@ module Test @@ -1000,7 +1000,7 @@ module Test"
  },

]
*/
//all files, not just the files changed?
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
        filesChanged = res.data
    } catch (error) {
        if (error.response) { 
            console.error(`Error! Status: ${error.response.status}. Message: ${error.response.data.message}`)
        }
        console.error(error);
    }
    return filesChanged
}