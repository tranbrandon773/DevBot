import Groq from "groq-sdk";
import dotenv from "dotenv";
dotenv.config();

export async function main() {
  const chatCompletion = await getGroqChatCompletion();
  // Print the completion returned by the LLM.
  console.log(chatCompletion.choices[0].message.content);
}

export async function getGroqChatCompletion() {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return groq.chat.completions.create({
    messages: [
        { 
            role: "system", 
            content: "Attached is an instruction that describes a task. Write a response that appropriately completes the request. You are a senior software engineer reviewing a pull request from a team member. You are given the code of a file along with the error that occurred on a specific line. Please fix only the error on the given line. You should prioritize removing code rather than commenting it out. Output fixed code for that line in a GitHub suggestion markdown, you should only include the line the error occured on rather than the rest of the code. You should briefly explain your fix in a conversational tone for your team members to understand and learn from. Your output should look like '```suggestion\\n{your code fix}\\n```\\n{your explanation for the fix}'. Make sure you wrap your entire output in a different style of quotes than the ones used in the input to prevent parsing errors."
        },
      {
        role: "user",
        content: '{"file": "main.py", "line": 1, "error": "F401 Import "numpy" imported but unused"} {"file": "main.py", "code": "import numpy\nprint("Hello World!")"}',
      },
    ],
    model: "llama3-70b-8192",
  });
}

export async function fixWithGroq(mappedErrors, codeForFiles) {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    let res = [];
    try {
      for (const err of mappedErrors) {
       const completion = await groq.chat.completions.create({
            messages: [
                { 
                    role: "system", 
                    content: "Attached is an instruction that describes a task. Write a response that appropriately completes the request. You are a senior software engineer reviewing a pull request from a team member. You are given the code of a file along with the error that occurred on a specific line. Please fix only the error on the given line. You should prioritize removing code rather than commenting it out. Output fixed code for that line in a GitHub suggestion markdown, you should only include the line the error occured on rather than the rest of the code. You should briefly explain your fix in a conversational tone for your team members to understand and learn from. Your output should look like '```suggestion\\n{your code fix}\\n```\\n{your explanation for the fix}'."
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

const mappedErrors = [{"file_path": "main.py", "line": 1, "error_desc": "F401 import 'numpy' unused"}]
const codeForFiles = {"main.py": "import numpy\nfor i in range(10):\n   print(i)"}

const fixesForFiles = await fixWithGroq(mappedErrors, codeForFiles);
console.log(fixesForFiles);