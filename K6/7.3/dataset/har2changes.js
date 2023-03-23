//read file from argument and parse it to json (ES6)
const fs = require('fs');
const fileHar = process.argv[2];
const fileChanges = process.argv[3];
let har = JSON.parse(fs.readFileSync(fileHar, 'utf8'));
let changes = [];
//find all _webSocketMessages from .har file
har.log.entries.forEach(entry => {
    if (entry._webSocketMessages) {
        entry._webSocketMessages.forEach(message => {
            if (message.type === "send" && message.data.includes(`"type":"saveChanges"`)) {
                //Extract text from first square brackets
                changes.push(message.data.substr(3).match(/\[(.+?)\]/)[0]);
                // changes.push(message.data);
            }
        });
    }
});
//write changes to file each element in array is a new line
fs.writeFileSync(fileChanges, changes.join('\n'));
