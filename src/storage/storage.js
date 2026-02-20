import fs from "fs"

export function saveJSON(data, file = "data.json"){
    fs.writeFileSync(file, JSON.stringify(data, null, 2))

}