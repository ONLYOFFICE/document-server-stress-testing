# ONLYOFFICE Document-Server Stress Testing

This repository contains load-test suites for [ONLYOFFICE Document Server][1].

| Suite | Status | Docs |
|-------|--------|------|
| **K6** | Active | [K6/Readme.md](K6/Readme.md) |
| **JMeter** | Deprecated | [JMeter/Readme.md](JMeter/Readme.md) |

---

## Quick Start (K6)

```bash
# Install k6 – see https://k6.io/docs/get-started/installation/
# Then run the main scenario (example)
k6 run K6/save-changes-document-random-close.js --vus 18 --duration 10m
```

For more details see the full guide in [`K6/Readme.md`](K6/Readme.md).

---

> Legacy JMeter instructions are kept for reference only and will be removed in a future cleanup.

[1]: https://github.com/ONLYOFFICE/DocumentServer