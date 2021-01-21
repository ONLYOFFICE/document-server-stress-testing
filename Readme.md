
# Description

[ONLYOFFICE Document Server][1] stress testing using JMeter

### Installing necessary components

Instruction for command-line installation and usage on Debian-based systems [available here](https://github.com/ONLYOFFICE/document-server-stress-testing/wiki/How-to-run-jmeter-from-terminal-on-ubuntu)

1. [JMeter](https://jmeter.apache.org/download_jmeter.cgi).

2. Install "WebSocket Samplers by Peter Doornbosch" JMeter plugin via [JMeter Plugins Manager](https://jmeter-plugins.org/install/Install/) or [manulally](https://github.com/ptrd/jmeter-websocket-samplers#usage) as .jar file

3. set property `websocket.thread.stop.policy=wsclose` according to [instructions](https://github.com/ptrd/jmeter-websocket-samplers#connections)

4. Set [services.CoAuthoring.token.enable.browser](https://api.onlyoffice.com/editors/signature/) configuration file property to false .

### User Defined Variables overview

#### 1-user-save -changes-document.jmx

- `number-of-threads`: JMeter thread group property
- `server-name-or-ip`: websocket host
- `port`: websocket port, whole url look like `ws://${server-name-or-ip}:${port}/doc/${doc-id}/c/806/e204ietx/websocket`
- `document-url`: url to docx document
- `changes`: only fit a specific `document-url` and [ONLYOFFICE Document Server][1] version
- `save-changes-throughput-per-minute`: amount of saveChanges per minute(jmeter constant throughput timer)
- `read-timeout`: Response (read) timeout (ms) for operations: "open and send auth", "read license", "read auth", "read getLock", "read saveLock", "read unSaveLock"

### Make new `changes` parameter

Follow these steps:
1. Open document with `document-url` in Chrome in [ONLYOFFICE Document Server][1] editor
2. Open Chrome DevTools (Ctrl + Shift + I) when opening a file
3. Make some edits in editor in strict Co-editing Mode and press Save
4. Go to the Network tab
5. Find the websocket Messages tab
6. Cut out `changes` param from message that starts with `["{\"type\":\"saveChanges\"`. Use it as the `changes` parameter

  [1]: https://github.com/ONLYOFFICE/DocumentServer


