import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();
/*

  Calls OpenAI API for each file to generate the code fix given new code and errors and adds the property to each file in mappedErrors
  @param mappedErrors: An array of objects with properties file_path, line, error_desc
  @param codeForFiles: An object with keys of file_path and values of content
  @returns Void
*/
export async function generateFixesForErrors(mappedErrors, codeForFiles ) {
  const key = process.env.OPENAI_API_KEY;
  const openai = new OpenAI({
      apiKey: key
  });
  try {
    for (const err of mappedErrors) {
      const completion = await openai.chat.completions.create({
        messages: [{ role: "system", content: "Attached is an instruction that describes a task. Write a response that appropriately completes the request. You are a senior software engineer reviewing a pull request from a team member. You are given the code of a file along with the error that occurred on a specific line. Please fix only the error on the given line. You should prioritize removing code rather than commenting it out. Output only the fix for that line without the rest of the code in a GitHub suggestin markdown. You should briefly explain your fix in a conversational tone for your team members to understand and learn from."},
                    {role: "user", content: `Code: ${codeForFiles[err.file_path]} Error: ${err.error_desc}`}
        ],
        model: "gpt-4o",
      });
      const codeFix = completion.choices[0].message.content;
      console.log(codeFix)
    };

  } catch (error) {
    if (error.response) { 
        console.error(`Error! Status: ${error.response.status}. Message: ${error.response.data.message}`);
    }
    console.error(error);
  }
}