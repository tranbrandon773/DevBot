import axios from 'axios'
import fs from 'fs'

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

export function parseWorkflowLog(pathToLog) {  
    let errors = [];
    const log = fs.readFileSync(pathToLog, 'utf8');
    const regex = /.error.*/ig;
    errors = log.match(regex);

    return errors;
}

export function findFilesFromErrors(errors) {
    const myMap = new Map();
    const regex = /([a-zA-Z0-9._-]+\.(java|js|cpp|py))/ig;
    errors.forEach((errorStr) => {
        const match = errorStr.match(regex);
        if (match) {
            if (!myMap.has(match[0])) {
                myMap.set(match[0], []);
            }
            myMap.get(match[0]).push(errorStr);
        }
    });
    return Array.from(myMap).map(([key, value]) => ({File: key, Errors: value }));
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