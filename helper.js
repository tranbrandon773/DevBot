import fs from 'fs';
import { execSync } from 'child_process';
import axios from 'axios';

/*
    Fetches the workflow log for a specific workflow run
    @param octokit: App that abstracts GitHub API requests
    @param payload: The response object from GitHub webhook events
    @returns The download URL for the workflow run log
*/
export async function getWorkflowLogs(octokit, payload) {
    let logsUrl;
    try {
        const res = await octokit.request('GET /repos/{owner}/{repo}/actions/runs/{run_id}/logs', {
            owner: payload.repository.owner.login,
            repo: payload.repository.name,
            run_id: payload.workflow_run.id,
            headers: {
                'X-GitHub-Api-Version': '2022-11-28'
            }
            });
        logsUrl = res.url;
        console.log("Successfully fetched the workflow log download URL!");
    } catch (error) {
        if (error.response) { 
            console.error(`Error! Status: ${error.response.status}. Message: ${error.response.data.message}`);
        }
        console.error(error);
    }
    return logsUrl;
}

/*
    Runs a shell script to download a workflow log
    @param link: Download URL for a workflow log
    @param dirName: Name for the directory to download the workflow log to
    @returns Void
*/
export function runShell(link, dirName) {
    const shellScript = `./scripts/fetchLog.sh "${link}" ${dirName}`;
    execSync(shellScript, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing script: ${error.message}`);
            return;
        }

        if (stderr) {
            console.error(`Script stderr: ${stderr}`);
            return;
        }
    });
    console.log("Successfully downloaded workflow logs!");
}

/*
    Runs a shell script to delete the workflow log files and directory
    @param dirName: Name of the directory to delete
    @returns Void
*/
export function runShellPost(dirName) {
    const shellScript = `./scripts/postrun.sh ${dirName}`;
    execSync(shellScript, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing script: ${error.message}`);
            return;
        }

        if (stderr) {
            console.error(`Script stderr: ${stderr}`);
            return;
        }
    });
    console.log("Successfully deleted workflow logs!");
}

/*
    Parses a workflow log (.txt) and finds all errors that occur
    @param pathToLog: Path to workflow log as a .txt file 
    @returns An array of error string(s) found in the workflow log
*/
export function parseWorkflowLogForErrors(pathToLog) {  
    let errors = [];
    const log = fs.readFileSync(pathToLog, 'utf8');
    const regex = /.error.*/ig;
    errors = log.match(regex);
    return errors;
}

/* 
    Maps errors to their respective files and the lines they occurred on
    @param errors: An array of error strings from a workflow log
    @returns An array of objects with properties file_path, line, error_desc
*/
export function mapErrorsToFiles(errors) {
    let res = [];
    /*
        /([a-zA-Z0-9._\/-]+) captures file path
        (\d+) captures error line
        (.*) captures error msg
    */
    const regex = /([a-zA-Z0-9._\/-]+):(\d+):\d+:(.*)/i;
    for (const error of errors) {
        const match = regex.exec(error)
        if (!match) continue; //only concerned with errors that occurred in the code aka associated with a file
        res.push({
            "file_path": match[1],
            "line": parseInt(match[2]),
            "error_desc": match[3],
        });
    }
    return res;
}

/*
    Fetches the code for every file in mappedErrors
    @param octokit: App that abstracts GitHub API requests
    @param payload: The response object from GitHub webhook events
    @param mappedErrors: An array of objects with properties file_path, line, error_desc
    @returns An object with keys of file_path and values of content
*/
export async function fetchCodeForFiles(octokit, payload, mappedErrors) {
    /*
    Fetches the file content for a file of a given repository and branch
    @param octokit: App that abstracts GitHub API requests
    @param payload: The response object from GitHub webhook events
    @param path: String denoting path to the file from the repository
    @param ref: Name of the branch to retrieve file content from
    @returns The content of the specified file
    */
    async function getFileContent(octokit, payload, path, ref) {
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