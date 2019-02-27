import * as Redux from 'redux';
import * as d from './stats.model';
import * as s from './store.model';
import * as w from '../game/world.model';
import * as storage from './storage';
import * as engine from '../game/engine';
import * as settings from '../game/settings';

let store: Redux.Store<s.State> = null;

export function init() {
    store = Redux.createStore(reducer, initialState());
}

function initialState(): s.State {
    const isNewPlayer = !storage.loadName();

    const room: s.RoomState = {
        id: null,
        mod: {},
        settings: settings.DefaultSettings,
    };
    return {
        loggedIn: false,
        showingHelp: true,
        isNewPlayer,
        playerName: storage.getOrCreatePlayerName(),
        keyBindings: storage.getKeyBindingsOrDefaults(),
        rebindings: storage.getRebindingsOrDefaults(isNewPlayer ? initialRebindingsNew() : initialRebindingsOld()),
        options: storage.getOptionsOrDefaults(),
        aiCode: null,
        current: { page: "", profileId: null },
        socketId: null,
        server: null,
        region: null,
        room,
        party: null,
        world: engine.initialWorld(room.mod),
        items: [],
        profile: null,
        allGameStats: new Map<string, d.GameStats>(),
        hasReplayLookup: new Map<string, string>(),
    };
}

function initialRebindingsOld(): KeyBindings {
    return {
        [w.SpecialKeys.DoubleTap]: "a",
    };
}

function initialRebindingsNew(): KeyBindings {
    return {
        [w.SpecialKeys.Hover]: w.Actions.Move,
        [w.SpecialKeys.LeftClick]: "q",
        [w.SpecialKeys.RightClick]: "a",
        [w.SpecialKeys.SingleTap]: "q",
        [w.SpecialKeys.DoubleTap]: "a",
    };
}


function reducer(state: s.State, action: s.Action): s.State {
    if (action.type === "serverPreparingToShutdown") {
	    return {
            ...state,
            socketId: null,
            server: null, // Don't reconnect to existing server since it's shutting down
        };
    } else if (action.type === "disconnected") {
	    return {
            ...state,
            socketId: null,
            party: null,
            world: {
                ...state.world,
                activePlayers: state.world.activePlayers.clear(),
            },
        };
    } else if (action.type === "updateAds") {
        return { ...state, ads: action.ads };
    } else if (action.type === "updateUserId") {
        let newState: s.State = { ...state, userId: action.userId, loggedIn: action.loggedIn, profile: null };
        if (action.loggedIn) {
            newState.isNewPlayer = false;
        }
        return newState;
    } else if (action.type === "logout") {
        return {
            ...state,
            userId: null,
            loggedIn: false,
            profile: null,
        };
    } else if (action.type === "updatePlayerName") {
        return { ...state, playerName: action.playerName };
    } else if (action.type === "updateKeyBindings") {
        return { ...state, keyBindings: action.keyBindings };
    } else if (action.type === "updateOptions") {
        return {
            ...state,
            options: {
                ...state.options,
                ...action.options,
            },
        };
    } else if (action.type === "updateUrl") {
        return { ...state, current: action.current };
    } else if (action.type === "updateHash") {
        return {
            ...state,
            current: {
                ...state.current,
                hash: action.hash,
            },
        };
    } else if (action.type === "updatePage") {
        return {
             ...state,
            current: {
                ...state.current,
                page: action.page,
                profileId: action.profileId,
            },
        };
    } else if (action.type === "joinMatch") {
        return {
            ...state,
            world: action.world,
            items: [],
            current: {
                ...state.current,
                gameId: action.world.ui.myGameId,
            },
        };
    } else if (action.type === "leaveMatch") {
        return {
            ...state,
            world: engine.initialWorld(state.room.mod),
            items: [],
            current: {
                ...state.current,
                gameId: null,
            },
        };
    } else if (action.type === "updateNotifications") {
        return { ...state, items: action.items }
    } else if (action.type === "updateRoom") {
        return {
            ...state,
            room: action.room,
            codeTree: null, // The mod has changed, make sure the modding window is showing the new mod
        };
    } else if (action.type === "joinParty") {
        if (!(state.party && state.party.id === action.party.id)) {
            return {
                ...state,
                party: action.party,
            };
        } else {
            return state;
        }
    } else if (action.type === "updateParty") {
        if (state.party && state.party.id == action.partyId) {
            return {
                ...state,
                party: {
                    ...state.party,
                    roomId: action.roomId,
                    members: action.members,
                    isPrivate: action.isPrivate,
                    isLocked: action.isLocked,
                },
            };
        } else {
            return state;
        }
    } else if (action.type === "leaveParty") {
        if (state.party && state.party.id === action.partyId) {
            return {
                ...state,
                party: null,
                current: {
                    ...state.current,
                    party: null,
                },
            };
        } else {
            return state;
        }
    } else if (action.type === "updateAiCode") {
        return { ...state, aiCode: action.aiCode };
    } else if (action.type === "updateShowingHelp") {
        return { ...state, showingHelp: action.showingHelp };
    } else if (action.type === "clearNewPlayerFlag") {
        return { ...state, isNewPlayer: false };
    } else if (action.type === "customizeBtn") {
        state.world.ui.customizingBtn = action.customizingBtn; // World always gets mutated
        return { ...state } // Create new object to trigger redux
    } else if (action.type === "updateHoverSpell") {
        state.world.ui.hoverSpellId = action.hoverSpellId; // World always gets mutated
        state.world.ui.hoverBtn = action.hoverBtn;
        return { ...state } // Create new object to trigger redux
    } else if (action.type === "updateRebindings") {
        return { ...state, rebindings: action.rebindings };
    } else if (action.type === "updateServer") {
        return { ...state, server: action.server, region: action.region, socketId: action.socketId };
    } else if (action.type === "updateProfile") {
        return { ...state, profile: action.profile };
    } else if (action.type === "updateGameStats") {
        const allGameStats = new Map<string, d.GameStats>(state.allGameStats);
        for (const gameStats of action.allGameStats) {
            allGameStats.set(gameStats.id, gameStats);
        }
        return { ...state, allGameStats };
    } else if (action.type === "updateHasReplay") {
        const hasReplayLookup = new Map<string, string>(state.hasReplayLookup);
        action.hasReplayLookup.forEach((hasReplay, gameId) => {
            hasReplayLookup.set(gameId, hasReplay);
        });
        return { ...state, hasReplayLookup };
    } else if (action.type === "updateCodeTree") {
        return { ...state, codeTree: action.codeTree };
    } else if (action.type === "updateCodeItem") {
        return {
            ...state,
            codeTree: {
                ...state.codeTree,
                [action.sectionKey]: {
                    ...state.codeTree[action.sectionKey],
                    [action.itemId]: action.code,
                },
            },
        };
    } else if (action.type === "deleteCodeItem") {
        const newSection = { ...state.codeTree[action.sectionKey] };
        delete newSection[action.itemId];

        const newState = {
            ...state,
            codeTree: {
                ...state.codeTree,
                [action.sectionKey]: newSection,
            },
        };
        return newState;
    } else {
        console.log(action);
        return state;
    }
}

export function dispatch(action: s.Action) {
    store.dispatch(action);
}

export function getState(): s.State {
    return store.getState();
}

export function getStore() {
    return store;
}