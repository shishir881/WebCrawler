import Groq from "groq-sdk";

if(!process.env.LLM_API_KEY){
    throw new Error("API key is missing")
}

export const groq = new Groq({
    apiKey: process.env.LLM_API_KEY
})