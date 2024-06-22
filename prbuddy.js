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

export async function fetchPR(octokit, payload, mappedErrors) {
    /*
    Fetches the file content for a file of a given repository and branch
    @param octokit: App that abstracts GitHub API requests
    @param payload: The response object from GitHub webhook events
    @param path: String denoting path to the file from the repository
    @param ref: Name of the branch to retrieve file content from
    @returns The content of the specified file
    */
    async function getPatch(octokit, payload, path, ref) {
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
            const res = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}?ref={ref}', {
                owner: payload.repository.owner.login,
                repo: payload.repository.name,
                path: path,
                ref: ref,
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
    const headRef = payload.workflow_run.pull_requests[0].head.ref; // PR branch
    for (const error of mappedErrors) {
        const content = await getFileContent(octokit, payload, error.file_path, headRef);
        res[error.file_path] = content;
    }
    return res;
}