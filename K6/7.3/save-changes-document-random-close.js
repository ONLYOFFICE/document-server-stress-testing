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

import exec from 'k6/execution';
import { SharedArray } from 'k6/data';
import { setTimeout, clearTimeout} from 'k6/experimental/timers';
import { randomString } from 'https://jslib.k6.io/k6-utils/1.1.0/index.js';
import {DocsCoApi} from "./lib/docscoapi.js";

export const options = {
    scenarios: {
        contacts: {
            executor: 'constant-vus',
            vus: 18,
            duration: '10m',
        },
    },
};

const changesArray = new SharedArray('changes', function () {
    const file = open('./dataset/changes.csv');
    return file.split('\n').map((line) => line.replace(/\\/g, ''));
});

const configFile = JSON.parse(open('./save-changes-document-random-close.json'));

export function setup() {
    let docIdPrefix = 'k6_' + randomString(10);
    return { docIdPrefix };
}

export default function (data) {
    const docsCoApi = new DocsCoApi();
    startTest(data, docsCoApi);

    docsCoApi.on('disconnect', () => {
        console.debug(`disconnect VU-${exec.vu.idInInstance}`);
        docsCoApi.close();
    });
}
async function startTest(cfg, docsCoApi) {
    try {
        console.debug(`startTest VU-${exec.vu.idInInstance}`);

        let serverProtoSuffix = configFile.serverProtoSuffix;
        let serverNameOrIp = configFile.serverNameOrIp;
        let serverPort = configFile.serverPort;
        let coeditorsCount = configFile.coeditorsCount;
        let saveChangesThroughputPerMinute = configFile.saveChangesThroughputPerMinute;
        let closeSessionPercentPerMinute = configFile.closeSessionPercentPerMinute;
        let documentUrl = configFile.documentUrl;
        let jwtSecret = configFile.jwtSecret;
        let timeoutConnection = configFile.timeoutConnection;
        let timeoutAuth = configFile.timeoutAuth;
        let timeoutDownload = configFile.timeoutDownload;
        let timeoutConvertion = configFile.timeoutConvertion;
        let timeoutReadTimeout = configFile.timeoutReadTimeout;
        let timeoutSaveLock = configFile.timeoutSaveLock;

        let docId = cfg.docIdPrefix + '_' + Math.floor(exec.vu.idInInstance / coeditorsCount);
        let url  = `ws${serverProtoSuffix}://${serverNameOrIp}:${serverPort}/doc/${docId}/c/?EIO=4&transport=websocket`;
        let callbackUrl  = `http${serverProtoSuffix}://${serverNameOrIp}:${serverPort}/dummyCallback`;
        let changes = changesArray[exec.vu.idInInstance % changesArray.length];
        let saveDelay = 60000 / saveChangesThroughputPerMinute;

       // ${__javaScript(${iteration-condition} || (${__threadNum}-1) * 100 < ${__property(iteration-sliding-close)} * ${number-of-threads} || (${__property(iteration-sliding-close)} + ${close-session-percent-per-minute}) * ${number-of-threads} <= (${__threadNum}-1) * 100)}

        await docsCoApi.open(docId, jwtSecret, {url, documentUrl, callbackUrl}, {timeoutConnection, timeoutAuth, timeoutConvertion, timeoutDownload});
        while (true) {
            let start = Date.now();
            await docsCoApi.saveChanges(changes, {timeoutSaveLock, timeoutReadTimeout});
            let end = Date.now();
            if (end - start < saveDelay) {
                await sleepPromise(saveDelay - (end - start))
            }
            let rnd = Math.random()
            let ttt = closeSessionPercentPerMinute / (100 * 60);
            console.error(`${rnd} < ${ttt}`)
            if (Math.random() < ttt) {
                break;
            }
        }
        docsCoApi.close();
    } catch(err) {
        console.error(`catch error VU-${exec.vu.idInInstance}:`, err, err.stack);
        docsCoApi.close();
    }
}
function sleepPromise(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
