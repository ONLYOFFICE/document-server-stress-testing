/*
 * (c) Copyright Ascensio System SIA 2010-2023
 *
 * This program is a free software product. You can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License (AGPL)
 * version 3 as published by the Free Software Foundation. In accordance with
 * Section 7(a) of the GNU AGPL its Section 15 shall be amended to the effect
 * that Ascensio System SIA expressly excludes the warranty of non-infringement
 * of any third-party rights.
 *
 * This program is distributed WITHOUT ANY WARRANTY; without even the implied
 * warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR  PURPOSE. For
 * details, see the GNU AGPL at: http://www.gnu.org/licenses/agpl-3.0.html
 *
 * You can contact Ascensio System SIA at 20A-6 Ernesta Birznieka-Upish
 * street, Riga, Latvia, EU, LV-1050.
 *
 * The  interactive user interfaces in modified source and object code versions
 * of the Program must display Appropriate Legal Notices, as required under
 * Section 5 of the GNU AGPL version 3.
 *
 * Pursuant to Section 7(b) of the License you must retain the original Product
 * logo when distributing the program. Pursuant to Section 7(e) we decline to
 * grant you any rights under trademark law for use of our trademarks.
 *
 * All the Product's GUI elements, including illustrations and icon sets, as
 * well as technical writing content are licensed under the terms of the
 * Creative Commons Attribution-ShareAlike 4.0 International. See the License
 * terms at http://creativecommons.org/licenses/by-sa/4.0/legalcode
 *
 */

import http from 'k6/http';
import { Trend, Counter } from 'k6/metrics';
import exec from 'k6/execution';
import { setTimeout, clearTimeout} from 'k6/experimental/timers';
import { SocketIoWrapper } from './socket.io.js';
import { encode as jwtEncode} from './jwt.js';

const trends = {
    'connect': new Trend('custom_trend_connect', true),
    'auth': new Trend('custom_trend_auth', true),
    'convert': new Trend('custom_trend_convert', true),
    'isSaveLock': new Trend('custom_trend_isSaveLock', true),
    'saveChanges': new Trend('custom_trend_saveChanges', true),
};
const counter = {
    'connect': new Counter('custom_counter_connect'),
    'auth': new Counter('custom_counter_auth'),
    'convert': new Counter('custom_counter_convert'),
    'isSaveLock': new Counter('custom_counter_isSaveLock'),
    'saveChanges': new Counter('custom_counter_saveChanges'),
}

export class DocsCoApi extends SocketIoWrapper{
    constructor() {
        super();
        this.io = null;
        this.timeoutContext = {};
        this.saveLockTimeout = null;
    }
    open(docId, userId, jwtSecret, urls, timeouts) {
        return new Promise((resolve, reject) => {
            this.private_open(docId, userId, jwtSecret, urls, timeouts, resolve, reject);
        });
    }
    saveChanges(changes, timeouts) {
        return new Promise((resolve, reject) => {
            this.private_isSaveLock(resolve, reject, changes, timeouts);
        });
    }
    close() {
        this.io && this.io.close();
    }
    private_onConect(err) {
        let name = `connect`;
        let ctx = this.private_clearTimeout(name);
        if (!ctx) {
            return;
        }
        if (err) {
            if (ctx.data.reject) {
                counter[name].add(1);
                ctx.data.reject(err);
                ctx.data.reject = null;
            }
            return;
        }
        console.debug(`connect VU-${exec.vu.idInTest}`);
        let timeouts = ctx.data.timeouts;
        ctx.data.authOperationCount = 0;
        this.private_setTimeout(`auth`, timeouts.timeoutAuth, ctx.data, (err) => {
            this.private_onAuth(err);
        });
        this.private_setTimeout(`convert`,timeouts.timeoutConvertion, ctx.data, (err) => {
            this.private_onDocumentOpen(err);
        });
        this.private_auth(ctx.data.docId, ctx.data.userId , ctx.data.jwtSecret, ctx.data.urls.documentUrl, ctx.data.urls.callbackUrl);
    };
    private_onAuth(err) {
        let name = `auth`;
        let ctx = this.private_clearTimeout(name);
        if (!ctx) {
            return;
        }
        if (err) {
            if (ctx.data.reject) {
                counter[name].add(1);
                ctx.data.reject(err);
                ctx.data.reject = null;
            }
            return;
        }
        ctx.data.authOperationCount++;
        if(ctx.data.authOperationCount >= 2) {
            ctx.data.resolve();
        }
    };
    private_onAuthChanges(err) {
        this.private_send({"type": "authChangesAck"});
    };
    private_onDocumentOpen(err, msg) {
        let name = `convert`;
        let ctx = this.private_clearTimeout(name);
        if (!ctx) {
            return;
        }
        if (err) {
            if (ctx.data.reject) {
                counter[name].add(1);
                ctx.data.reject(err);
                ctx.data.reject = null;
            }
            return;
        }
        if(msg && msg.data && msg.data.data) {
            const url = msg.data.data["Editor.bin"];
            http.get(url, {timeout: ctx.data.timeouts.timeoutDownload});
            ctx.data.authOperationCount++;
            if(ctx.data.authOperationCount >= 2) {
                ctx.data.resolve();
            }
        }
    };
    private_onSaveLock(err, msg) {
        let name = `isSaveLock`;
        let ctx = this.private_clearTimeout(name);
        if (!ctx) {
            return;
        }
        if (err) {
            if (ctx.data.reject) {
                counter[name].add(1);
                ctx.data.reject(err);
                ctx.data.reject = null;
            }
            return;
        }
        let resolve = ctx.data.resolve;
        let reject = ctx.data.reject;
        let changes = ctx.data.changes;
        let timeouts = ctx.data.timeouts;
        if (msg.saveLock) {
            let timeoutSaveLock = ctx.data.timeouts.timeoutSaveLock + Math.floor(Math.random() * ctx.data.timeouts.timeoutSaveLockRandom);
            this.saveLockTimeout = setTimeout(() => {
                this.saveLockTimeout = null;
                this.private_setTimeout(`isSaveLock`, timeouts.timeoutReadTimeout, ctx.data, (err) => {
                    this.private_onSaveLock(err);
                });
                this.private_isSaveLock(resolve, reject, changes, timeouts);
            }, timeoutSaveLock);
        } else {
            this.private_saveChanges(resolve, reject, changes, timeouts);
        }
    };
    private_onUnSaveLock(err) {
        let name = `saveChanges`;
        let ctx = this.private_clearTimeout(name);
        if (!ctx) {
            return;
        }
        if (err) {
            if (ctx.data.reject) {
                counter[name].add(1);
                ctx.data.reject(err);
                ctx.data.reject = null;
            }
            return;
        }
        ctx.data.resolve();
    };
    private_open(docId, userId, jwtSecret, urls, timeouts, resolve, reject) {
        this.io = new SocketIoWrapper();

        this.private_setTimeout(`connect`, timeouts.timeoutConnection,
            {resolve, reject, docId, userId, jwtSecret, urls, timeouts},
            (err) => {
            this.private_onConect(err);
        });
        this.io.on(`connect`, () => {
            this.private_onConect(null);
        });
        this.io.on(`error`, (error) => {
            this.private_onConect(error);
        });
        this.io.on(`disconnect`, () => {
            this.private_clearAllTimeouts();
        });
        this.io.on(`message`, (msg) => {
            switch (msg.type) {
                case `auth`: {
                    this.private_onAuth(null, msg);
                    break;
                }
                case `authChanges`: {
                    this.private_onAuthChanges(null, msg);
                    break;
                }
                case `documentOpen`: {
                    this.private_onDocumentOpen(null, msg);
                    break;
                }
                case `connectState`: {
                    this.private_unLockDocument();
                    break;
                }
                case `saveLock`: {
                    this.private_onSaveLock(null, msg);
                    break;
                }
                case `unSaveLock`: {
                    this.private_onUnSaveLock(null, msg);
                    break;
                }
                case 'drop':
                case 'error':
                    let err = new Error(msg.type);
                    this.private_onAuth(err);
                    this.private_onDocumentOpen(err);
                    this.private_onSaveLock(err);
                    this.private_onUnSaveLock(err);
                    break;
            }
        });
        this.io.connect(urls.url, this.private_getOpenToken(docId, userId, jwtSecret, urls.documentUrl, urls.callbackUrl));
    };
    private_getOpenToken(docId, userId, jwtSecret, documentUrl, callbackUrl) {
        if (!jwtSecret) {
            return null;
        }
        let data = {
            document: {
                key: docId,
                url: documentUrl,
                "permissions": {
                    "chat": true,
                    "comment": true,
                    "copy": true,
                    "download": true,
                    "edit": true,
                    "fillForms": true,
                    "modifyContentControl": true,
                    "modifyFilter": true,
                    "print": true,
                    "review": true,
                    "reviewGroups": null,
                    "commentGroups": {},
                    "userInfoGroups": null
                }
            },
            editorConfig: {
                callbackUrl: callbackUrl,
                "mode": "edit",
                "user": {
                    "id": userId
                }
            }
        };
        return jwtEncode(data, jwtSecret);
    }
    private_auth(docId, userId, jwtSecret, documentUrl, callbackUrl) {
        let data = {
            "type": "auth",
            "docid": `${docId}`,
            "documentCallbackUrl": `${callbackUrl}`,
            "token": "fghhfgsjdgfjs",
            "user": {"id": userId, "username": "John Smith", "firstname": null, "lastname": null, "indexUser": -1},
            "editorType": 0,
            "lastOtherSaveTime": -1,
            "block": [],
            "sessionId": null,
            "sessionTimeConnect": null,
            "sessionTimeIdle": 0,
            "documentFormatSave": 65,
            "view": false,
            "isCloseCoAuthoring": false,
            "openCmd": {
                "c": "open",
                "id": `${docId}`,
                "userid": "uid-1",
                "format": "docx",
                "url": `${documentUrl}`,
                "title": "new (47).docx",
                "lcid": 9,
                "nobase64": true,
                "convertToOrigin": ".pdf.xps.oxps.djvu"
            },
            "lang": "en",
            "mode": "edit",
            "permissions": {
                "chat": true,
                "comment": true,
                "copy": true,
                "download": true,
                "edit": true,
                "fillForms": true,
                "modifyContentControl": true,
                "modifyFilter": true,
                "print": true,
                "review": true,
                "reviewGroups": null,
                "commentGroups": {},
                "userInfoGroups": null
            },
            "IsAnonymousUser": false,
            "timezoneOffset": -180,
            "coEditingMode": "fast",
            "jwtOpen": "",
            "supportAuthChangesAck": true
        };
        if (jwtSecret) {
            data.jwtOpen = this.private_getOpenToken(docId, userId, jwtSecret, documentUrl, callbackUrl);
        }
        this.private_send(data);
    }
    private_isSaveLock(resolve, reject, changes, timeouts) {
        this.private_setTimeout(`isSaveLock`, timeouts.timeoutReadTimeout, {resolve, reject, changes, timeouts}, (err) => {
            this.private_onSaveLock(err);
        });
        this.private_send({"type":"isSaveLock"});
    }
    private_saveChanges(resolve, reject, changes, timeouts) {
        this.private_setTimeout(`saveChanges`, timeouts.timeoutReadTimeout, {resolve, reject, changes, timeouts}, (err) => {
            this.private_onUnSaveLock(err);
        });
        this.private_send({
            "type": "saveChanges",
            "changes": changes,
            "startSaveChanges": true,
            "endSaveChanges": true,
            "isCoAuthoring": false,
            "isExcel": false,
            "deleteIndex": null,
            "unlock": false,
            "releaseLocks": false
        });
    }
    private_unLockDocument() {
        this.private_send({"type": "unLockDocument", "isSave": false, "unlock": true, "deleteIndex": -1});
    }
    private_send(data) {
        this.io.emit('message', data);
    }
    private_setTimeout(name, timeout, data, callback) {
        //todo performance.now
        const start = Date.now();
        const timeoutId = setTimeout(() => {
            callback(new Error(`timeout: ${name}`));
        }, timeout);
        this.timeoutContext[name] = {timeoutId, start, data, callback};
    }
    private_clearTimeout(name) {
        let end = Date.now();
        if (this.timeoutContext[name]) {
            trends[name].add(end - this.timeoutContext[name].start);
            clearTimeout(this.timeoutContext[name].timeoutId);
            let ctx = this.timeoutContext[name];
            delete this.timeoutContext[name];
            return ctx;
        }
        return null;
    }
    private_clearAllTimeouts() {
        for (let name in this.timeoutContext) {
            if (this.timeoutContext.hasOwnProperty(name)) {
                clearTimeout(this.timeoutContext[name].timeoutId);
                delete this.timeoutContext[name];
            }
        }
        if (this.saveLockTimeout) {
            clearTimeout(this.saveLockTimeout);
            this.saveLockTimeout = null;
        }
    }
}