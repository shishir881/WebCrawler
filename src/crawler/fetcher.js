// get raw HTML
import axios from "axios";

export async function fetchHTML(url) {
    const res = await axios.get(url, {timeout: 10000})
    return res.data
    
}