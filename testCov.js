import OpenAI from "openai";

/*
    Generate tests for each file changed
    @param filesChanged: An array of objects with properties sha, filename, status, raw_url
    @param codeForFilesChanged: An object with keys of file_name and values of content
    @returns An array of objects with properties file_name and code_suggestion
*/
export async function generateTestsForFiles(filesChanged, codeForFilesChanged) {
    const key = process.env.OPENAI_API_KEY;
    const openai = new OpenAI({
        apiKey: key
    });
    let res = [];
    try {
      for (const file of filesChanged) {
        const completion = await openai.chat.completions.create({
          messages: [{ role: "system", content:"Attached is an instruction that describes a task. Write a response that appropriately completes the request. You are a senior software engineer reviewing a pull request from a team member. You are given the code of a newly changed file and are tasked with reviewing the code and developing any missing test coverage. If you are given a function, you should write some unit tests to validate the function's outputs. Your output should look like:  ```\\n{your tests}\\n```{a brief discussion of the tests}"},
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