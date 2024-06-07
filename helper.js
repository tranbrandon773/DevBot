import axios from 'axios'
import fs from 'fs'

/*
    Fetches the workflow log for a specific workflow run
    @param octokit: App that abstracts GitHub API requests
    @param owner: String denoting owner of the repository
    @param repo: String denoting repository name
    @param runId: String denoting ID of the given workflow run
    @returns The download URL for the workflow run log
*/
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
            console.error(`Error! Status: ${error.response.status}. Message: ${error.response.data.message}`);
        }
        console.error(error);
    }
    console.log(`Logs URL: ${logsUrl}`);
    return logsUrl;
};

/*
    Parses a workflow log (.txt) and finds all errors
    @param pathToLog: Path to workflow log as a .txt file 
    @returns An array of error string(s) found in the workflow log
*/
export function parseWorkflowLog(pathToLog) {  
    let errors = [];
    const log = fs.readFileSync(pathToLog, 'utf8');
    const regex = /.error.*/ig;
    errors = log.match(regex);

    return errors;
}

/* 
    Maps error(s) to their respective file(s)
    @param errors: An array of error strings from a workflow log
    @returns An array of Maps with properties FileName and Errors
*/
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

/*
    Fetches the file content for a given repository and branch
    @param octokit: App that abstracts GitHub API requests
    @param owner: String denoting owner of the repository
    @param repo: String denoting repository name
    @param path: String denoting path to the file from the repository
    @param ref: String denoting the branch to retrieve the file content from
    @returns The download URL for the file content

*/
export async function getFileContent(octokit, owner, repo, path, ref) {
    let downloadUrl;
    try {
        const res = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}?ref={ref}', {
            owner: owner,
            repo: repo,
            path: path,
            ref: ref,
            headers: {
                'X-GitHub-Api-Version': '2022-11-28'
            }
            });
        downloadUrl = res.data.downloadUrl;
    } catch (error) {
        if (error.response) { 
            console.error(`Error! Status: ${error.response.status}. Message: ${error.response.data.message}`);
        }
        console.error(error);
    }
    return downloadUrl
}