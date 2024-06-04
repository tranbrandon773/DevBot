import axios from 'axios'

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
            })
    } catch (error) {
        if (error.response) { 
            console.error(`Error! Status: ${error.response.status}. Message: ${error.response.data.message}`)
        }
        console.error(error)
    }
}

export async function getWorkflowLogs(octokit, owner, repo, runId) {
    let logsUrl;
    try {
        await octokit.request('GET /repos/{owner}/{repo}/actions/runs/{run_id}/logs', {
            owner: owner,
            repo: repo,
            run_id: runId,
            headers: {
                'X-GitHub-Api-Version': '2022-11-28'
            }
            })
        logsUrl = res.url
        // logs = await axios.get(logsUrl, {
        //     responseType: 'arraybuffer',  
        // });
        console.log(`Logs URL: ${logsUrl}`)
    } catch (error) {
        if (error.response) { 
            console.error(`Error! Status: ${error.response.status}. Message: ${error.response.data.message}`)
        }
        console.error(error)
    }
    console.log(`Logs URL: ${logsUrl}`)
};