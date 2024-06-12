import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();
/*
  Calls OpenAI API for each file to generate the code fix given old code, new code, and errors
  @param mappedErrors: An array of Maps with properties file_name, errors, old_code, new_code
  @returns An object with key file_name and value fixed code
*/
export async function generateFixesForErrors(mappedErrors) {
  const key = process.env.OPENAI_API_KEY;
  const openai = new OpenAI({
      apiKey: key
  });
  let res = {};
  for (const file of mappedErrors) {
    const completion = await openai.chat.completions.create({
      messages: [{ role: "system", content: "Attached is an instruction that describes a task. Write a response that appropriately completes the request. You are given the old and new code of a file along with the errors that occurred in the new code. Please fix the errors. Only output the code."},
                  {role: "user", content: `Old Code: ${file.old_code} New Code: ${file.new_code} Errors: ${file.errors}`}
      ],
      model: "gpt-4o",
    });
    res.file.name = completion.choices[0].message.content;
  };
  return res;
}