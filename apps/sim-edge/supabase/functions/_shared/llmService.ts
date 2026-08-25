import { ChatOpenAI } from "npm:@langchain/openai@latest";
import { ChatGroq } from 'npm:@langchain/groq';
import { z } from "npm:zod";
import { zodToJsonSchema } from "npm:zod-to-json-schema";
import { JsonOutputParser } from "npm:@langchain/core/output_parsers";
import { RunnablePassthrough } from "npm:@langchain/core/runnables";
import { PromptTemplate } from "npm:@langchain/core/prompts";
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

if (!OPENAI_API_KEY) {
    console.error('[WeekGraph] OPENAI_API_KEY environment variable is not set!');
}

export const openAILLM = new ChatOpenAI(
{
    openAIApiKey: OPENAI_API_KEY,
    model: "gpt-4.1-mini",
    temperature: 0.0
});


export const groqLLM = new ChatGroq({
      model: "groq/compound-mini", // Choose a Groq-supported model
      temperature: 0,
      // Other optional parameters can be added here
 });


 export function createManualStructuredOutputChain(schema: z.ZodSchema) {
  const parser = new JsonOutputParser();
  const schemaJson = zodToJsonSchema(schema);
  const formatInstructions = `Respond in valid JSON only. The JSON object must conform to this schema: ${JSON.stringify(schemaJson, null, 2)}`;

  // The prompt template now includes a placeholder for the user's messages
  const structuredPrompt = new PromptTemplate({
    template: `You are a helpful assistant that generates JSON output based on the user's request.
    
    User messages:
    {user_messages}

    {format_instructions}
    
    Output: `,
    inputVariables: ["user_messages"],
    partialVariables: { format_instructions: formatInstructions },
  });

  // Create a chain that takes user messages, formats them, and then pipes them to the model and parser
  const chain = RunnablePassthrough.assign({
    user_messages: (input: any) => JSON.stringify(input),
  }).pipe(structuredPrompt).pipe(groqLLM).pipe(parser);

  return chain;
}

 