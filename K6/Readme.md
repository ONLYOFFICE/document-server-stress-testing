# ONLYOFFICE Document Server stress testing with K6

This document describes how to run stress testing of [ONLYOFFICE Document Server](https://github.com/ONLYOFFICE/DocumentServer
) using K6.

## Run tests

1. [Install](https://k6.io/docs/get-started/installation/) K6

2. Fill your server proto, host, port, secret in `save-changes-document-random-close.json

3. [Run](https://k6.io/docs/get-started/running-k6/) test according to your execution mode. For example on local machine

[Constant VUs](https://k6.io/docs/using-k6/k6-options/reference/#vus)

`k6 run save-changes-document-random-close.js --vus 18 --duration 10m`

[Ramping VUs](https://k6.io/docs/using-k6/k6-options/reference/#stages)

`k6 run save-changes-document-random-close.js -s "5m":18 -s "5m":0`

## Overview of save-changes-document-random-close.json config file

- `serverProtoSuffix`: `""` for ws/http, `"s"` for wss/https.
- `serverNameOrIp`: host.
- `serverPort`: port.
- `coeditorsCount`: `1` for , `>1` for coediting(each user gets 'changes line' by round-robin from changes.csv) 
- `saveChangesThroughputPerMinute`: Amount of saveChanges per minute
- `closeSessionPercentPerMinute`: Percentage of threads closing per minute
- `docsApi.enable`: open document with docsApi protocol
- `docsApi.documentUrl`:  URL to the document.
- `docsApi.callbackUrl`:  handler that returns `{"error": 0}` on a POST request. `dummyCallback` from docserver is fine.
- `docsApi.jwtSecret`: secret from `services.CoAuthoring.secret.inbox.string` or empty if jwt is turned off
- `wopi.enable`: open document with WOPI protocol
- `wopi.wopiHost`: host that support CheckFileInfo, Lock, Unlock, GetFile, PutFile operations.
docserver with `wopi.dummy.enable=true` is fine.
- `changesPath`:  path to the document with changes.
- `downloadStaticContent`:  map of static files to download before connecting to websocket.
- `timeoutConnection`:  connect timeout (ms) for all requests.
- `timeoutAuth`:  Response (read) timeout (ms) for "auth".
- `timeoutDownload`:  Response (read) timeout (ms) for Editor.bin download.
- `timeoutConvertion`: Response (read) timeout (ms) for operations: "documentOpen".
- `timeoutReadTimeout`:  Response (read) timeout (ms) for operations: "read license", "read auth", "read getLock", "read saveLock", "read unSaveLock".
- `timeoutSaveLock`:  constant delay for repeating saveLock request
- `timeoutSaveLockRandom`:  maximum random addition to timeoutSaveLock 

## Data set of document changes

- `changes.csv`: list of changes id separeted by new line. changes are distributed across threads by round-robin. 
changes must be independent so that they can be applied multiple times and in any order. 
For example, adding characters to paragraph, adding autoshapes, changing properties of existing elements.
- `sample.docx` : example of file on basis of which you can create changes.csv step by step: 
open web edior with dev console -> apply onlyoffice macros -> save har file -> `har2changes.js site.har changes.csv`
- `har2changes.js` : tool to convert .har file into changes.csv: `har2changes.js site.har changes.csv`

