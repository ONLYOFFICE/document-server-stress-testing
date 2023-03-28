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
import { Counter } from 'k6/metrics';
import { setTimeout, clearTimeout} from 'k6/experimental/timers';
import { randomString } from 'https://jslib.k6.io/k6-utils/1.1.0/index.js';
import {DocsCoApi} from "./lib/docscoapi.js";

const CounterExceptions = new Counter('custom_counter_exception_all');
const CounterManualClose = new Counter('custom_counter_manual_close');

export const options = {
    summaryTimeUnit: 'ms',
    discardResponseBodies: true,
    summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'count'],
    thresholds: {
        custom_counter_exception_all: ['count==0'],
        custom_counter_exception_connect: ['count==0'],
        custom_counter_exception_auth: ['count==0'],
        custom_counter_exception_convert: ['count==0'],
        custom_counter_exception_isSaveLock: ['count==0'],
        custom_counter_exception_saveChanges: ['count==0'],
    },
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
    console.info(`docIdPrefix: ${docIdPrefix}`);
    return { docIdPrefix };
}

const docsCoApi = new DocsCoApi();
export default function (data) {
    startTest(data, docsCoApi);

    docsCoApi.on('disconnect', () => {
        console.debug(`disconnect VU-${exec.vu.idInTest}`);
        docsCoApi.close();
    });
}

async function startTest(cfg, docsCoApi) {
    try {
        console.debug(`startTest VU-${exec.vu.idInTest}`);

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
        let timeoutSaveLockRandom = configFile.timeoutSaveLockRandom;

        //add minutesOfDay to docId to avoid collisions with coediting saved file
        let minutesOfDay = new Date().getHours() * 60 + new Date().getMinutes();
        let docId;
        if (coeditorsCount > 1) {
            docId = `${cfg.docIdPrefix}_${minutesOfDay}_${Math.ceil(exec.vu.idInTest / coeditorsCount)}_${exec.vu.iterationInScenario}`;
        } else {
            docId = `${cfg.docIdPrefix}_${minutesOfDay}_${exec.vu.idInTest}_${exec.vu.iterationInScenario}`;
        }
        let userId = `uid-${exec.vu.idInTest}-${exec.vu.iterationInScenario}-`;
        let url  = `ws${serverProtoSuffix}://${serverNameOrIp}:${serverPort}/doc/${docId}/c/?EIO=4&transport=websocket`;
        let callbackUrl  = `http${serverProtoSuffix}://${serverNameOrIp}:${serverPort}/dummyCallback`;
        let changes = changesArray[exec.vu.idInTest % changesArray.length];
        let saveDelay = 60000 / saveChangesThroughputPerMinute;

        await docsCoApi.open(docId, userId, jwtSecret, {url, documentUrl, callbackUrl}, {timeoutConnection, timeoutAuth, timeoutConvertion, timeoutDownload});
        let startCloseSession = Date.now();
        while (true) {
            let startSaveChanges = Date.now();
            let saveRes = await docsCoApi.saveChanges(changes, {timeoutReadTimeout});
            let endSaveChanges = Date.now();
            if (saveRes) {
                if (endSaveChanges - startSaveChanges < saveDelay) {
                    //saveChangesThroughputPerMinute
                    await sleepPromise(saveDelay - (endSaveChanges - startSaveChanges));
                }
            } else {
                //save is locked. wait random time
                let lockDelay = timeoutSaveLock + Math.floor(Math.random() * timeoutSaveLockRandom);
                await sleepPromise(lockDelay);
            }

            //closeSessionPercentPerMinute
            if (Date.now() - startCloseSession > 60000) {
                startCloseSession = Date.now();
                //todo close all coeditors
                if (Math.random() * 100 < closeSessionPercentPerMinute) {
                    break;
                }
            }
            if (exec.scenario.progress >= 1) {
                //for gracefulStop
                break;
            }
        }
        CounterManualClose.add(1);
        docsCoApi.close();
    } catch(err) {
        CounterExceptions.add(1);
        console.error(`catch error VU-${exec.vu.idInTest}:`, err, err.stack);
        docsCoApi.close();
    }
}
function sleepPromise(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
