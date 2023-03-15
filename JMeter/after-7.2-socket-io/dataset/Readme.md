# Data set for co-editing-save-changes-document-random-close.jmx

- `docid.csv`: list of documents id separeted by new line. ids are distributed across threads by round robin. 
so number of co-editors will be `number-of-threads` / line_count_of(docid.csv). 
it is better to replace ids in file with each test in order to avoid conflicts with cached or assembled files from previous test.
- `changes.csv`: list of changes id separeted by new line. changes are distributed across threads by round robin. 
changes must be independent so that they can be applied multiple times and in any order. 
For example, adding characters to paragraph, adding autoshapes, changing properties of existing elements. 
changes must be received manually from a browser connected to the server that will be tested or from har file.
and must  so number of co-editors will be `number-of-threads` / line_count(docid.csv)
- `sample.docx` : example of file to which you can add changes. You must manually create a link to it and add it to the test.