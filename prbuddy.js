import axios from 'axios';
import OpenAI from "openai";

/*
    Gets files changed from a pull request
    @param octokit: App that abstracts GitHub API requests
    @param payload: The response object from GitHub webhook events
    @returns An array of objects with (important) properties filename, status, contents_url
*/
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
        filesChanged = res.data;
        console.log("Successfully fetched files changed from PR!")
    } catch (error) {
        if (error.response) { 
            console.error(`Error! Status: ${error.response.status}. Message: ${error.response.data.message}`)
        }
        console.error(error);
    }
    return filesChanged;
}

/*
    Fetches the code for every file in filesChanged
    @param octokit: App that abstracts GitHub API requests
    @param filesChanged: An array of objects with (important) properties filename, status, contents_url
    @returns An object with keys of file_path and values of content
*/
export async function fetchCodeForFilesChanged(octokit, filesChanged) {
    /*
    Fetches the file content for a file of a given repository and branch
    @param octokit: App that abstracts GitHub API requests
    @param contentsUrl: URL to contents of the file
    @returns The content of the specified file
    */
    async function getFileContent(octokit, contentsUrl) {
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
            const res = await octokit.request(`GET ${contentsUrl}`, {
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
                console.log("AAA")
                console.log(downloadUrl);
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
    for (const file of filesChanged) {
        const content = await getFileContent(octokit, file.contents_url);
        res[file.filename] = content;
    }
    return res;
}

/*
    Generate suggestions for each file changed
    @param filesChanged: An array of objects with properties sha, filename, status, raw_url
    @param codeForFilesChanged: An object with keys of file_name and values of content
    @returns An array of objects with properties file_name and code_suggestion
*/
export async function generateSuggestionsForFiles(filesChanged, codeForFilesChanged) {
    const key = process.env.OPENAI_API_KEY;
    const openai = new OpenAI({
        apiKey: key
    });
    let res = [];
    try {
      for (const file of filesChanged) {
        const completion = await openai.chat.completions.create({
          messages: [{ role: "system", content:"Attached is an instruction that describes a task. Write a response that appropriately completes the request. You are a senior software engineer reviewing a pull request from a team member. You are given the code of a newly changed file and are tasked with reviewing the code and finding any improvements that can be made. Improvements include but are not limited to refactoring, efficiency, and documenting. I want you to make improvements to the code itself and discuss your changes/feedback. Your output should look like: ```\\n{your code improvements}\\n```\\n{your feedback}"},
                      {role: "user", content: `Name: ${file.filename} Code: ${codeForFilesChanged[file.filename]}`}
          ],
          model: "gpt-4o",
        });
        const codeFix = completion.choices[0].message.content;
        res.push({
          "file_name": file.filename,
          "code_suggestion": codeFix
        });
      }
      console.log("Successfully generated suggestions for code improvement!");
    } catch (error) {
      if (error.response) { 
          console.error(`Error! Status: ${error.response.status}. Message: ${error.response.data.message}`);
      }
      console.error(error);
    }
    return res;
}

/* 
    Comments improved code and feedback suggestions on PR
    @param octokit: App that abstracts GitHub API requests
    @param payload: The response object from GitHub webhook events
    @param improvedCode: An array of objects with properties file_name and code_suggestion

*/
export async function commentOnPr(octokit, payload, improvedCode) {
    for (const file of improvedCode) {
        try {
            await octokit.request("POST /repos/{owner}/{repo}/issues/{issue_number}/comments", {
              owner: payload.repository.owner.login,
              repo: payload.repository.name,
              issue_number: payload.issue.number,
              body: file.code_suggestion,
              headers: {
                "x-github-api-version": "2022-11-28",
              },
            });
            console.log("Successfully commented on PR!")
          } catch (error) {
            if (error.response) {
              console.error(`Error! Status: ${error.response.status}. Message: ${error.response.data.message}`)
            }
            console.error(error)
          }
    }
}