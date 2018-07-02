import * as React from 'react';
import * as ReactDOM from 'react-dom';

import socketLib from 'socket.io-client';
import queryString from 'query-string';

import { joinNewGame, attachToCanvas, attachToSocket, attachNotificationListener, CanvasStack } from './facade';
import { getStore, applyNotificationsToStore } from './storeProvider';
import * as Storage from '../ui/storage';
import { Choices } from '../game/constants';
import * as w from '../game/world.model';

import { InfoPanel } from './infoPanel';
import { MessagesPanel } from './messagesPanel';

const socket = socketLib();

const playerName = getOrCreatePlayerName();

function getOrCreatePlayerName(): string {
    let name = Storage.loadName();
    if (!name) {
        name = "Enigma" + (Math.random() * 10000).toFixed(0);
        Storage.saveName(name);
    }
    return name;
}

let joinedInitialGame = false;
let observeGameId: string = null;
if (window.location.search) {
    const params = queryString.parse(window.location.search);
    if (params["g"]) {
        observeGameId = params["g"];
    }
}

attachToSocket(socket, () => {
    if (!joinedInitialGame) {
        joinedInitialGame = true;
        joinNewGame(playerName, retrieveKeyBindings(), observeGameId);
        observeGameId = null;
    }
});
attachToCanvas({
    background: document.getElementById("background") as HTMLCanvasElement,
    glows: document.getElementById("glows") as HTMLCanvasElement,
    canvas: document.getElementById("canvas") as HTMLCanvasElement,
    ui: document.getElementById("ui") as HTMLCanvasElement,
} as CanvasStack);
attachNotificationListener(notifications => {
    applyNotificationsToStore(notifications);
    rerender();
});

rerender();

function onNewGameClicked() {
    if (getStore().disconnected) {
        // New server? Reload the client, just in case the version has changed.
        window.location.reload();
    } else {
        joinNewGame(playerName, retrieveKeyBindings());
        window.history.pushState(null, null, "?");
    }
}

function rerender() {
    ReactDOM.render(
        <InfoPanel
            playerName={playerName}
            store={getStore()} />,
        document.getElementById("info-panel"));
    ReactDOM.render(
        <MessagesPanel
            store={getStore()}
            newGameCallback={onNewGameClicked} />,
            document.getElementById("messages-panel"));
}

function retrieveKeyBindings() {
    return Storage.loadKeyBindingConfig() || Choices.Defaults;
}