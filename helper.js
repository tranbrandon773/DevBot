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
    let files = new Set();
    const regex = /([a-zA-Z0-9._-]+\.(java|js|cpp|py))/ig;
    errors.forEach((errorStr) => {
        const match = errorStr.match(regex);
        if (match) files.add(match[0]);
    });

    return files;
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

const errors = parseWorkflowLog('/Users/brandontran/Documents/logs_36/0_build.txt')
console.log(errors)
const files = findFilesFromErrors(errors)
console.log(files)