/*
    Creates a new tree to apply code fixes to
    @param octokit: App that abstracts GitHub API requests
    @param payload: The response object from GitHub webhook events
    @param mappedErrors: An array of Maps with properties file_name, errors, new_code, code_fix
    @returns The sha for the new tree
*/
export async function createTreeForFixes(octokit, payload, mappedErrors) {
    let newTreeSha;
    try {
        const res = await octokit.request('POST /repos/{owner}/{repo}/git/trees', {
            owner: payload.repository.owner.login,
            repo: payload.repository.name,
            base_tree: payload.workflow_run.pull_requests[0].head.sha,
            tree: mappedErrors.map((file) => (
                {
                    path: file.file_name,
                    mode: '100644',
                    type: 'blob',
                    content: file.code_fix,
                }
            )),
            headers: {
              'X-GitHub-Api-Version': '2022-11-28'
            }
          });
        newTreeSha = res.sha;
    } catch (error) {
        if (error.response) { 
            console.error(`Error! Status: ${error.response.status}. Message: ${error.response.data.message}`);
        }
        console.error(error);
    }
    return newTreeSha;
} 

/*
    Fetches latest commit Sha of pull request branch
    @param octokit: App that abstracts GitHub API requests
    @param payload: The response object from GitHub webhook events
    @returns The latest commit Sha as a string
*/
export async function fetchLatestCommitSha(octokit, payload) {
    let latestCommitSha;
    try {
        const res = await octokit.request('GET /repos/{owner}/{repo}/commits/{ref}', {
            owner: payload.repository.owner.login,
            repo: payload.repository.name,
            ref: `heads/${payload.workflow_run.pull_requests[0].head.ref}`,
            headers: {
              'X-GitHub-Api-Version': '2022-11-28'
            }
          });
          latestCommitSha = res.sha;
    } catch (error) {
        if (error.response) { 
            console.error(`Error! Status: ${error.response.status}. Message: ${error.response.data.message}`);
        }
        console.error(error);
    }
    return latestCommitSha;
}
/*
    Creates a new commit for a newly created tree
    @param octokit: App that abstracts GitHub API requests
    @param payload: The response object from GitHub webhook events
    @param commitMsg: Message for the new commit
    @param newTreeSha: The sha of the newly created tree
    @returns The sha for the new commit
*/
export async function createCommitForNewTree(octokit, payload, commitMsg, newTreeSha) {

    const parentCommitSha = await fetchLatestCommitSha(octokit, payload); //newly created commit needs to have previous commit as parent
    let newCommitSha;
    try {
        const res = await octokit.request('POST /repos/{owner}/{repo}/git/commits', {
            owner: payload.repository.owner.login,
            repo: payload.repository.name,
            message: commitMsg,
            parents: [      
                parentCommitSha
            ],
            tree: newTreeSha,
            headers: {
              'X-GitHub-Api-Version': '2022-11-28'
            }
          });
          newCommitSha = res.sha;
    } catch (error) {
        if (error.response) { 
            console.error(`Error! Status: ${error.response.status}. Message: ${error.response.data.message}`);
        }
        console.error(error);
    }
    return newCommitSha;
}

/*
    Updates the reference branch to point to the new commit
    @param octokit: App that abstracts GitHub API requests
    @param payload: The response object from GitHub webhook events
    @param newCommitSha: The sha of the newly created commit
    @returns Void
*/
export async function updateRefToPointToNewCommit(octokit, payload, newCommitSha) {
    try {
        await octokit.request('PATCH /repos/{owner}/{repo}/git/refs/{ref}', {
            owner: payload.repository.owner.login,
            repo: payload.repository.name,
            ref: payload.workflow_run.pull_requests[0].head.ref,
            sha: newCommitSha,
            force: true,
            headers: {
              'X-GitHub-Api-Version': '2022-11-28'
            }
          });
    } catch (error) {
        if (error.response) { 
            console.error(`Error! Status: ${error.response.status}. Message: ${error.response.data.message}`);
        }
        console.error(error);
    }
}
    