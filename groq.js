import Groq from "groq-sdk";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

export async function fixWithGroq(mappedErrors, codeForFiles) {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    let res = [];
    try {
      for (const err of mappedErrors) {
       const completion = await groq.chat.completions.create({
            messages: [
                { 
                    role: "system", 
                    content: "Attached is an instruction that describes a task. Write a response that appropriately completes the request. You are a senior software engineer reviewing a pull request from a team member. You are given the code of a file along with the error that occurred on a specific line. Please fix only the error on the given line. You should prioritize removing code rather than commenting it out. Output fixed code for that line in a GitHub suggestion markdown, including only the line where the error occurred rather than the rest of the code. Briefly explain your fix in a conversational tone for your team members to understand and learn from. Your output should look like: ```suggestion\\n{your code fix}\\n```\\n{your explanation for the fix}. For example, if there is an unused library, your output should be: ```suggestion\\n```\\n{your explanation for the fix}. Notice how the suggestion is empty because you are removing the unused library."
                },
              {
                role: "user",
                content: `Code: ${codeForFiles[err.file_path]} Error: ${err.error_desc} Error Line: ${err.line}`
              },
            ],
            model: "llama3-70b-8192",
          });
        const codeFix = completion.choices[0]?.message?.content;
        res.push({
          "file_path": err.file_path,
          "line": err.line,
          "code_fix": codeFix
        });
      }
      console.log("Successfully generated fixes for errors!");
    } catch (error) {
      if (error.response) { 
          console.error(`Error! Status: ${error.response.status}. Message: ${error.response.data.message}`);
      }
      console.error(error);
    }
    return res;
}

export async function fixWithGPT(mappedErrors, codeForFiles) {
    const key = process.env.OPENAI_API_KEY;
    const openai = new OpenAI({
        apiKey: key
    });
    let res = [];
    try {
      for (const err of mappedErrors) {
        const completion = await openai.chat.completions.create({
          messages: [{ role: "system", content: "Attached is an instruction that describes a task. Write a response that appropriately completes the request. You are a senior software engineer reviewing a pull request from a team member. You are given the code of a file along with the error that occurred on a specific line. Please fix only the error on the given line. You should prioritize removing code rather than commenting it out. Output fixed code for that line in a GitHub suggestion markdown, including only the line where the error occurred rather than the rest of the code. Briefly explain your fix in a conversational tone for your team members to understand and learn from. Your output should look like: ```suggestion\\n{your code fix}\\n```\\n{your explanation for the fix}. For example, if there is an unused library, your output should be: ```suggestion\\n```\\n{your explanation for the fix}. Notice how the suggestion is empty because you are removing the unused library."},
                      {role: "user", content: `Here is an example, Code: ${codeForFiles[err.file_path]} Error: ${err.error_desc} Error Line: ${err.line}`}
          ],
          model: "gpt-4o",
        });
        const codeFix = completion.choices[0].message.content;
        res.push({
          "file_path": err.file_path,
          "line": err.line,
          "code_fix": codeFix
        });
      }
      console.log("Successfully generated fixes for errors!");
    } catch (error) {
      if (error.response) { 
          console.error(`Error! Status: ${error.response.status}. Message: ${error.response.data.message}`);
      }
      console.error(error);
    }
    return res;
  }
const mappedErrors = [{"file_path": "main.py", "line": 1, "error_desc": "F401 import 'numpy' unused"},
                    {"file_path": "main.py", "line": 3, "error_desc": "E999 SyntaxError: Expected ':', found newline"}
                    ]
const codeForFiles = {"main.py": "import numpy\nfor i in range(10)\n   print(i)"}

const fixesForFiles = await fixWithGroq(mappedErrors, codeForFiles);
console.log(fixesForFiles);