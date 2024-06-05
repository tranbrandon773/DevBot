import axios from 'axios'

export async function getWorkflowLogs(octokit, owner, repo, runId) {
    let logsUrl;
    try {
        const res = await octokit.request('GET /repos/{owner}/{repo}/actions/runs/{run_id}/logs', {
            owner: owner,
            repo: repo,
            run_id: runId,
            headers: {
                'X-GitHub-Api-Version': '2022-11-28'
            }
            });
        logsUrl = res.url;
        // logs = await axios.get(logsUrl, {
        //     responseType: 'arraybuffer',  
        // });
    } catch (error) {
        if (error.response) { 
            console.error(`Error! Status: ${error.response.status}. Message: ${error.response.data.message}`)
        }
        console.error(error);
    }
    console.log(`Logs URL: ${logsUrl}`);
};

export async function getFilesChangedFromPullRequest(octokit, payload) {
    let filesChanged;
    try {
        const res = await octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}/files', {
            owner: payload.repository.owner.login,
            repo: payload.repository.name,
            pull_number: payload.workflow_run.pull_requests[0].number,
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
    console.log(filesChanged)
}
 
export async function getFileContent(octokit, owner, repo, path, sha) {
    try {
        await octokit.request('GET /repos/{owner}/{repo}/contents/{path}?ref={ref}', {
            owner: owner,
            repo: repo,
            path: path,
            ref: sha,
            headers: {
                'X-GitHub-Api-Version': '2022-11-28'
            }
            });
    } catch (error) {
        if (error.response) { 
            console.error(`Error! Status: ${error.response.status}. Message: ${error.response.data.message}`)
        }
        console.error(error);
    }
}