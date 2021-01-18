
# Description

[ONLYOFFICE Document Server][1] stress testing using JMeter

### Installing necessary components

Instruction for command-line installation and usage on Debian-based systems [aviable here](https://github.com/ONLYOFFICE/document-server-stress-testing/wiki/How-to-run-jmeter-from-terminal-on-ubuntu)

1. [JMeter](https://jmeter.apache.org/download_jmeter.cgi).

2. Install "WebSocket Samplers by Peter Doornbosch" JMeter plugin via [JMeter Plugins Manager](https://jmeter-plugins.org/install/Install/) or [manulally](https://github.com/ptrd/jmeter-websocket-samplers#usage) as .jar file

3. set property `websocket.thread.stop.policy=wsclose` according to [instructions](https://github.com/ptrd/jmeter-websocket-samplers#connections)

### User Defined Variables overview

#### 1-user-save -changes-document.jmx

- `number-of-threads`: JMeter thread group property
- `server-name-or-ip`: websocket host
- `port`: websocket port, whole url look like `ws://${server-name-or-ip}:${port}/doc/${doc-id}/c/806/e204ietx/websocket`
- `document-url`: url to docx document
- `changes`: only fit a specific `document-url` and [ONLYOFFICE Document Server][1] version
- `save-changes-throughput-per-minute`: amount of saveChanges per minute(jmeter constant throughput timer)
- `read-timeout`: Response (read) timeout (ms) for operations: "open and send auth", "read license", "read auth", "read getLock", "read saveLock", "read unSaveLock"

  [1]: https://github.com/ONLYOFFICE/DocumentServer


