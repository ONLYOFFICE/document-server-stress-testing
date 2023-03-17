# ONLYOFFICE Document Server stress testing

This repository describes how to run stress testing of [ONLYOFFICE Document Server][1] using JMeter.

### Installing necessary components

1. Install [JMeter](https://jmeter.apache.org/download_jmeter.cgi). Instructions for command line installation and usage on Debian-based systems are available [here](https://github.com/ONLYOFFICE/document-server-stress-testing/wiki/How-to-run-jmeter-from-terminal-on-ubuntu).

2. Install the "WebSocket Samplers by Peter Doornbosch" JMeter plugin via [JMeter Plugins Manager](https://jmeter-plugins.org/install/Install/) or [manulally](https://github.com/ptrd/jmeter-websocket-samplers#usage) as a .jar file.

3. Set property `websocket.thread.stop.policy=wsclose` according to [these instructions](https://github.com/ptrd/jmeter-websocket-samplers#connections).

4. Set [services.CoAuthoring.token.enable.browser](https://api.onlyoffice.com/editors/signature/) configuration file property to false.

5. Set `services.CoAuthoring.socketio.connection.pingInterval` configuration file property to 1000000000.

### Overview of User Defined Variables

#### 1-user-save-changes-document.jmx

- `number-of-threads`: JMeter thread group property.
- `coeditors-count`: number of co-authors in one document. Set by the number of lines in changes.csv
- `server-name-or-ip`: WebSocket host.
- `port`: WebSocket port, the full URL looks like `ws://${server-name-or-ip}:${port}/doc/${doc-id}/c/806/e204ietx/websocket`.
- `document-url`: URL to the docx document.
- `callback-url`: URL to send the assembled file (if empty, forgotten will be stored). Starting from version 6.5 of [ONLYOFFICE Document Server][1], you can use dummyCallback handler.
- `changes`: Only fits with a specific `document-url` and version 6.3 of [ONLYOFFICE Document Server][1].
- `save-changes-throughput-per-minute`: Amount of saveChanges per minute (see JMeter constant throughput timer).
- `close-session-percent-per-minute`: Percentage of threads closing the connection at the end of the minute, calculated by __threadNum.
- `connect-timeout`: Connect timeout (ms) for all requests.
- `download-timeout`: Response (read) timeout (ms) for operations: "read documentOpen".
- `auth-timeout`: Response (read) timeout (ms) for operations: "open and send auth".
- `read-timeout`: Response (read) timeout (ms) for operations: "read license", "read auth", "read getLock", "read saveLock", "read unSaveLock".
- `conversion-timeout`: Response (read) timeout (ms) for operations: "read documentOpen".
- `close-timeout`: Response (read) timeout (ms) for operations: "close".

### Making new `changes` parameter

Follow these steps:
1. Open document with `document-url` in Chrome with ONLYOFFICE editor ([Document Server][1]).
2. Open Chrome DevTools (Ctrl + Shift + I) when opening a file.
3. Type `Sample data` in the editor in the Strict co-editing mode and press Save.
4. Go to the Network tab.
5. Find the WebSocket Messages tab.
6. Cut out `changes` param from the message that starts with `["{\"type\":\"saveChanges\"`. Use it as the `changes` parameter.

  [1]: https://github.com/ONLYOFFICE/DocumentServer
