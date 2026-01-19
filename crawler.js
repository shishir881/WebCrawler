import { fetchHTML } from "./fetcher.js";
import { extractLinks, extractText } from "./parser.js";

export async function crawl(startURL, maxPages = 5) {
    const visited = new Set()
    const queue = [startURL]
    const results = [] // for ml training

    while(queue.length && results.length < maxPages){
        const url = queue.shift()

        if(visited.has(url)) continue;

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
                    queue.push(link); } // finding new link


        } catch (error) {
            console.log("Process failed", error);
            
        }


        
    }
    return results
}
