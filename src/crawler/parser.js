export function extractText(html) {

  if (typeof html !== "string") {
    return "";
  }

  html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ""); // removing <script> blocks
  html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ""); // removing <style> blocks

  return html
    .replace(/<[^>]+>/g, " ") //remove remaining tags
    .replace(/\s+/g, " ") // normalize the whitespaces
    .trim();
}

export function extractLinks(html) {
    if (typeof html !== "string") {
    return [];
  }
  const links = [];
  const regex = /href="(http[^"]+)"/g;

  let match;
  while ((match = regex.exec(html)) !== null) {
    links.push(match[1]);
  }
  return links;
}

