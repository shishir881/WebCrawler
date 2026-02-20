import "dotenv/config";
const USE_FASTAPI = process.env.USE_FASTAPI === "true";

import { saveJSON } from "./storage/storage.js";

import { crawl, structureWithLLM, filterWithFastAPI, displayResults } from  "./crawler/crawler.js";
import readline from "readline";

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, (answer) => {
            resolve(answer.trim());
        });
    });
}

function isValidURL(urlString) {
    try {
        new URL(urlString);
        return true;
    } catch (e) {
        return false;
    }
}

async function getURLInput() {
    let url = "";
    let isValid = false;

    while (!isValid) {
        url = await question("\nEnter seed URL (or press Enter for default): ");

        if (url === "") {
            url = "https://www.geeksforgeeks.org/machine-learning/ai-ml-and-data-science-tutorial-learn-ai-ml-and-data-science/";
            console.log(`Using default: ${url}`);
            isValid = true;
        } else if (isValidURL(url)) {
            console.log(`Valid URL: ${url}`);
            isValid = true;
        } else {
            console.log(" Invalid URL. Please enter a valid URL (e.g., https://example.com)");
        }
    }

    return url;
}

async function getMaxPagesInput() {
    let maxPages = "";
    let isValid = false;

    while (!isValid) {
        maxPages = await question("\n Enter max pages to crawl (default: 5): ");

        if (maxPages === "") {
            maxPages = 5;
            console.log(` Using default: ${maxPages} pages`);
            isValid = true;
        } else if (Number.isInteger(parseInt(maxPages)) && parseInt(maxPages) > 0) {
            maxPages = parseInt(maxPages);
            console.log(`Will crawl up to ${maxPages} pages`);
            isValid = true;
        } else {
            console.log("Please enter a valid number greater than 0");
        }
    }

    return maxPages;
}

async function getOutputFilename() {
    let filename = await question("\nEnter output filename (default: filtered_results.json): ");

    if (filename === "") {
        filename = "filtered_results.json";
    }

    if (!filename.endsWith(".json")) {
        filename += ".json";
    }

    console.log(`Output will be saved to: ${filename}`);
    return filename;
}

function displayMenu() {
        console.log("\nOptions:");
    console.log("  1. Start crawling with custom URL");
    console.log("  2. Use default settings");
    console.log("  3. Exit");
    console.log();
}

async function main() {
    try {
        displayMenu();
        const choice = await question("Select option (1-3): ");

        let seedURL;
        let maxPages;
        let outputFile;

        if (choice === "1") {
            seedURL = await getURLInput();
            maxPages = await getMaxPagesInput();
            outputFile = await getOutputFilename();
        } else if (choice === "2") {
            seedURL = "https://www.geeksforgeeks.org/machine-learning/ai-ml-and-data-science-tutorial-learn-ai-ml-and-data-science/";
            maxPages = 5;
            outputFile = "filtered_results.json";
            console.log("\n Using default settings:");
            console.log(`   URL: ${seedURL}`);
            console.log(`   Max pages: ${maxPages}`);
            console.log(`   Output: ${outputFile}`);
        } else if (choice === "3") {
            console.log("\n Exiting...");
            rl.close();
            return;
        } else {
            console.log("Invalid option. Please select 1-3");
            rl.close();
            return;
        }

        rl.close();

        // STAGE 1: Crawling
        console.log("STAGE 1:  Web Crawling");
        console.log("━".repeat(90) + "\n");

        const rawPages = await crawl(seedURL, maxPages);

        if (rawPages.length === 0) {
            console.log(" No pages crawled. Exiting.");
            return;
        }

        // STAGE 2: LLM Structuring
        console.log("STAGE 2: LLM Structuring (Groq)");
        console.log("━".repeat(90) + "\n");

        const structuredPages = await structureWithLLM(rawPages);

        if (structuredPages.length === 0) {
            console.log("LLM structuring failed. Exiting.");
            return;
        }

        // STAGE 3: FastAPI ML Filtering
        console.log("STAGE 3: 🔧 FastAPI ML Filtering & Ranking");
        console.log("━".repeat(90) + "\n");

        const filteredPages = await filterWithFastAPI(structuredPages);

        if (filteredPages.length === 0) {
            console.log(" FastAPI filtering failed or returned no results. Exiting.");
            return;
        }

        displayResults(filteredPages);

        // Save Results
        console.log("STAGE 4: Saving Results");
        console.log("━".repeat(90) + "\n");

        saveJSON(filteredPages, outputFile);
        console.log(`Results saved to ${outputFile}`);

       
        console.log(`   Raw pages crawled:        ${rawPages.length}`);
        console.log(`   Successfully structured: ${structuredPages.length}`);
        console.log(`   After ML filtering:      ${filteredPages.length}`);
        console.log("\n Pipeline complete!");

    } catch (error) {
        console.error("Fatal Error:", error.message);
        rl.close();
        process.exit(1);
    }
}

main();