
# Description

[ONLYOFFICE Document Server][1] stress testing using JMeter

### Installing necessary components

1. [JMeter](https://jmeter.apache.org/download_jmeter.cgi)

2. Install "WebSocket Samplers by Peter Doornbosch" JMeter plugin via [JMeter Plugins Manager](https://jmeter-plugins.org/install/Install/) or [manulally](https://github.com/ptrd/jmeter-websocket-samplers#usage) as .jar file

3. set property `websocket.thread.stop.policy=wsclose` according to [instructions](https://github.com/ptrd/jmeter-websocket-samplers#connections)

### User Defined Variables owerview

#### 1-user-save -changes-document.jmx

- server-name-or-ip: websocket host
- port: websocket port
- document-url: url to docx document
- changes: only fit a specific `document-url`
- save-changes-throughput-per-minute: amount of saveChanges per minute(jmeter constant throughput timer)

  [1]: https://github.com/ONLYOFFICE/DocumentServer


