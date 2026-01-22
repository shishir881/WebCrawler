// import { fetchHTML } from "./fetcher.js";
import { extractLinks, extractText } from "./parser.js";
import { Groq } from "groq-sdk";

import axios from "axios";

async function fetchHTML(url) {
    const response = await axios.get(url, {
        timeout: 10000,
        headers: {
            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept": "text/html,application/xhtml+xml",
            "Referer": "https://www.google.com/",
        },
    });

    return response.data;
}


const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8000"
const LLM_API_KEY = process.env.LLM_API_KEY

const groq = new Groq({
    apiKey: LLM_API_KEY,
})


export async function crawl(startURL, maxPages = 5) {
    const visited = new Set()
    const queue = [startURL]
    const results = [] // for ml training

    while (queue.length && results.length < maxPages) {
        const url = queue.shift()
        // Skip non-HTML / useless URLs
        if (
            /\.(png|jpe?g|gif|svg|ico|webp|woff2?|ttf|eot|css|js)$/i.test(url) ||
            url.includes("fonts.googleapis.com") ||
            url.includes("fonts.gstatic.com")
        ) {
            console.log("Skipping asset:", url);
            continue;
        }


        if (visited.has(url)) continue;

        visited.add(url)

        try {

            console.log("visiting..", url);
            const html = await fetchHTML(url)
            console.log("html length", html.length);


            const text = await extractText(html)
            console.log("extracted text: ", text.slice(0, 100));

            const links = await extractLinks(html)

            results.push({ url, text })

            for (const link of links) {
                if (!visited.has(link))
                    queue.push(link);
            } // finding new link


        } catch (error) {
            console.log("Process failed", error);

        }



    }
    console.log(`Crawled ${results.length} pages`);

    return results
}

//llm structuring

export async function structureWithLLM(rawpages) {
    if (!rawpages || rawpages.length === 0) {
        console.log("No page to structire");
        return []

    }

    const structuredPages = []

    for (let i = 0; i < rawpages.length; i++) {
        const page = rawpages[i];
        console.log("Structuring pages");

        if (/\.(png|jpe?g|gif|ico|svg)$/i.test(page.url)) {
            console.log("Skipping non-HTML content:", page.url);
            continue; // skip images, icons, etc.
        }
        if (!page.text || page.text.length < 500) {
            console.log("Skipping low-content page:", page.url);
            continue;
        }



        try {
            const structured = await structureSinglePage(page.url, page.text)
            if (structured) {
                // structuredPages.push(structured)
                 console.log("Structured JSON:", JSON.stringify(structured, null, 2));
    structuredPages.push(structured);
            }
        } catch (error) {
            console.error("Failed to structure");

        }


    }

    console.log(`\nStructured ${structuredPages.length} pages\n`);
    return structuredPages;

}

async function structureSinglePage(url, text) {
    const prompt = `
You are a data extraction system that converts raw webpage text into structured JSON.

Given the following webpage content, extract and return ONLY valid JSON in this EXACT format:

{
  "url": "${url}",
  "priority_features": {
    "page_summary": "Brief one-sentence summary of the page content",
    "primary_topic": "Main topic or category of the page",
    "key_entities": ["entity1", "entity2", "entity3"],
    "content_depth": 0.0,
    "is_actionable": true
  },
  "spam_features": {
    "link_density": 0.0,
    "has_urgency_words": false,
    "is_error_page": false,
    "grammar_quality_score": 0.0,
    "suspicious_patterns": 0
  }
}

RULES:
- content_depth: 0.0 to 1.0 (0=binary/image, 0.5=metadata, 1.0=rich educational content)
- is_actionable: true ONLY if it's educational/tutorial content with actionable steps
- key_entities: Extract 2-5 important entities/keywords
- link_density: 0.0 to 1.0 (ratio of links to total content)
- has_urgency_words: true if contains "buy now", "limited time", "act fast", etc.
- is_error_page: true if it's a 404, error page, or non-existent page
- grammar_quality_score: 0.0 to 1.0 (assess grammatical correctness)
- suspicious_patterns: Count of suspicious patterns (image extensions, very long URLs, etc)
- NO markdown, NO explanations, ONLY valid JSON

WEBPAGE CONTENT:
${text.slice(0, 3000)}
`;

    try {
        const completion = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            temperature: 0.2,
            messages: [{ role: "user", content: prompt }],
        });

        const responseText = completion.choices[0].message.content;

        // Extract JSON from response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error(`No JSON found in response for ${url}`);
            return null;
        }

        const structured = JSON.parse(jsonMatch[0]);
        return structured;

    } catch (error) {
        console.error(`LLM Error for ${url}: ${error.message}`);
        return null;
    }
}

export async function filterWithFastAPI(structuredPages) {
    if (!USE_FASTAPI) {
        console.log("FastAPI disabled — skipping ML filtering");
        return structuredPages;
    }

    if (!structuredPages || structuredPages.length === 0) {
        console.log("No structured pages to filter");
        return [];
    }

    try {
        console.log(`Sending ${structuredPages.length} pages to FastAPI...`);

        const response = await axios.post(
            `${FASTAPI_URL}/filter`,
            structuredPages,
            {
                timeout: 120000,
                headers: { "Content-Type": "application/json" }
            }
        );

        console.log(`FastAPI returned ${response.data.length} pages`);
        return response.data;

    } catch (error) {
        console.warn("FastAPI unreachable — returning unfiltered data");
        return structuredPages; 
    }
}

export function displayResults(filteredPages) {
    if (filteredPages.length === 0) {
        console.log(" No high-quality pages found");
        return;
    }

    console.log("\n" + "=".repeat(90));
    console.log("FINAL RESULTS - Ranked by Priority (FastAPI ML Model)");
    console.log("=".repeat(90) + "\n");

    filteredPages.forEach((page, idx) => {
        console.log(`${idx + 1}. ${page.url}`);
        console.log(`   Priority: ${(page.priority_score * 100).toFixed(1)}% | Spam Risk: ${(page.spam_probability * 100).toFixed(1)}%`);
        console.log(`   Topic: ${page.priority_features.primary_topic}`);
        console.log(`   Summary: ${page.priority_features.page_summary}`);
        console.log(`   Actionable: ${page.priority_features.is_actionable ? "Yes" : "No"}`);
        console.log();
    });
}