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
    } catch (error) {
        if (error.response) { 
            console.error(`Error! Status: ${error.response.status}. Message: ${error.response.data.message}`);
        }
        console.error(error);
    }
    return logsUrl;
}

/*
    Runs a shell script to download the workflow logs to the VM
    @param link: Download URL for a given workflow log
    @param newName: Name for the directory to download the workflow log to
    @returns Void
*/
export function runShell(link, newName) {
    const shellScript = `./scripts/fetchLog.sh "${link}" ${newName}`;
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
}

/*
    Runs a shell script to delete the workflow log files and directory from the VM
    @param newName: Name of the directory to delete
    @returns Void
*/
export function runShellPost(newName) {
    const shellScript = `./scripts/postrun.sh ${newName}`;
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
}

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
    @returns An array of Maps with properties file_name and errors
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
    return Array.from(myMap).map(([key, value]) => ({file_name: key, errors: value }));
}

/*
    Fetches new code for every file in mappedErrors and modifies it in place by adding them as properties
    @param octokit: App that abstracts GitHub API requests
    @param payload: The response object from GitHub webhook events
    @param mappedErrors: An array of Maps with properties file_name and errors
    @returns Void
*/
export async function fetchNewCode(octokit, payload, mappedErrors) {

    /*
    Fetches the file content for a given repository and branch
    @param octokit: App that abstracts GitHub API requests
    @param payload: The response object from GitHub webhook events
    @param path: String denoting path to the file from the repository
    @param ref: String denoting the branch to retrieve the file content from
    @returns The content of the specified file

    */
    async function getFileContent(octokit, payload, path, ref) {
        let downloadUrl;
        // Helper function to retrieve content using axios
        const fetchContent = async (url) => {
            try {
                const response = await axios.get(url);
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

    const headRef = payload.workflow_run.pull_requests[0].head.ref; // PR branch
  
    for (const file of mappedErrors) {
      const newCode = await getFileContent(octokit, payload, file.file_name, headRef);
      file.new_code = newCode;
    };
}