import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();
/*

  Calls OpenAI API for each file to generate the code fix given new code and errors and adds the property to each file in mappedErrors
  @param mappedErrors: An array of Maps with properties file_name, errors, new_code
  @returns Void
*/
export async function generateFixesForErrors(mappedErrors) {
  const key = process.env.OPENAI_API_KEY;
  const openai = new OpenAI({
      apiKey: key
  });
  try {
    for (const file of mappedErrors) {
      const completion = await openai.chat.completions.create({
        messages: [{ role: "system", content: "Attached is an instruction that describes a task. Write a response that appropriately completes the request. You are given the code of a file along with the errors that occurred in the code. Please fix the errors and only output the code."},
                    {role: "user", content: `Code: ${file.new_code} Errors: ${file.errors}`}
        ],
        model: "gpt-4o",
      });
      file.code_fix = completion.choices[0].message.content;
    };
  } catch (error) {
    if (error.response) { 
        console.error(`Error! Status: ${error.response.status}. Message: ${error.response.data.message}`);
    }
    console.error(error);
  }
}