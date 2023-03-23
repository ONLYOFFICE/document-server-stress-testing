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
import { WebSocket } from 'k6/experimental/websockets';

export const EngineIOPacketTypes = {
    "open": 0,
    "close": 1,
    "ping" : 2,
    "pong": 3,
    "message": 4,
    "upgrade": 5,
    "noop": 6
}
export const SocketIOPacketTypes = {
    "connect": 0,
    "disconnect": 1,
    "event": 2,
    "ack": 3,
    "error": 4,
    "binaryEvent": 5,
    "binaryAck": 6
}

export class  SocketIoWrapper{
    constructor() {
        this.ws = null;
        this.token = null;
        this.callbacks = {};
    }
    connect(url, token) {
        this.ws = new WebSocket(url);
        this.token = token;

        this.ws.addEventListener('open', () => {
            this.ws.addEventListener('message', (e) => {
                this.private_processMessage(e.data);
            });

            this.ws.addEventListener('close', () => {
                this.private_emitEvent('disconnect', this);
            });
        });
        this.ws.addEventListener(`error`, (error) => {
            this.private_emitEvent('error', error);
        });
    }
    close() {
        this.ws && this.ws.close();
        console.debug(`close VU-${exec.vu.idInInstance}`);
    }
    on(event, callback) {
        this.callbacks[event] = callback;
    }
    emit(message, data) {
        const msg = encode(EngineIOPacketTypes.message, SocketIOPacketTypes.event, [message, data]);
        this.private_send(msg);
    }
    private_processMessage(msg) {
        console.debug(`event VU-${exec.vu.idInInstance}: `, msg.substr(0, 1000));
        const engineType = parseInt(msg[0]);
        const socketType = parseInt(msg[1]);
        switch (engineType) {
            case EngineIOPacketTypes.open: {
                let data = this.token  ? {token: this.token} : {};
                this.private_send(encode(EngineIOPacketTypes.message, SocketIOPacketTypes.connect, data));
                break;
            }
            case EngineIOPacketTypes.ping: {
                this.private_send(encode(EngineIOPacketTypes.pong));
                break;
            }
            default: {
                switch (socketType) {
                    case SocketIOPacketTypes.connect: {
                        this.private_emitEvent('connect', this);
                        break;
                    }
                    case SocketIOPacketTypes.event: {
                        const parsedResponse = msg.match(/\[.+\]/);
                        const msgObject = parsedResponse ? JSON.parse(parsedResponse[0]) : [];
                        if (msgObject[0]) {
                            this.private_emitEvent(msgObject[0], msgObject[1]);
                        }
                        break;
                    }
                }
                break;
            }
        }
    }
    private_emitEvent(type, data) {
        if(this.callbacks[type]) {
            this.callbacks[type](data);
        }
    }
    private_send(msg) {
        this.ws.send(msg);
        console.debug(`emit VU-${exec.vu.idInInstance}: `, msg.substr(0, 1000));
    }
}

function encode(eType, sType, data) {
    let msg = `${eType}`;
    if (undefined !== sType) {
        msg += `${sType}`;
    }
    if (undefined !== data) {
        msg += `${JSON.stringify(data)}`;
    }
    return msg;
}