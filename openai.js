import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const key = process.env.OPENAI_API_KEY
gi
const openai = new OpenAI({
    apiKey: key
});

async function main() {
  const completion = await openai.chat.completions.create({
    messages: [{ role: "system", content: "Below is an instruction that describes a task. Write a response that appropriately completes the request. You are given the old and new code of a given file along with the errors that occurred in the new code. Please fix the errors. Only output the code."},
                {role: "user", content: "Old Code: ```print('Hello World!')``` New Code: ```import numpy as np \n print('Hello World!')``` Errors: [main.py:1:17: F401 `numpy` imported but unused]"}
    ],
    model: "gpt-4o",
  });

  console.log(completion.choices[0]);
}

main();