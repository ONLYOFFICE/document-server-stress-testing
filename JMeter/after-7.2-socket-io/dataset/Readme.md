# Data set for co-editing-save-changes-document-random-close.jmx

- `changes.csv`: list of changes id separeted by new line. changes are distributed across threads by round robin. 
changes must be independent so that they can be applied multiple times and in any order. 
For example, adding characters to paragraph, adding autoshapes, changing properties of existing elements.
- `sample.docx` : example of file on basis of which you can create changes.csv step by step: 
open web edior with dev console -> apply onlyoffice macros -> save har file -> har2changes.js site.har changes.csv
- `har2changes.js` : tool to convert .har file into changes.csv