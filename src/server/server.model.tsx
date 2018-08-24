import * as moment from 'moment';
import * as m from '../game/messages.model';

export interface ServerStore {
    nextGameId: 0;
    nextRoomId: 0;
    numConnections: number;
    rooms: Map<string, Room>; // id -> room
    activeGames: Map<string, Game>; // id -> game
    inactiveGames: Map<string, Game>; // id -> game
    recentTickMilliseconds: number[];
}

export interface LocationStore {
    server: string;
    upstreamSuffix: string;
}

export interface Game {
    id: string;
    room: string | null;
    created: moment.Moment;

    mod: Object;
    allowBots: boolean;

    active: Map<string, Player>; // socketId -> Player
    bots: Map<string, string>; // heroId -> socketId
    playerNames: string[];
    accessTokens: Set<string>;
    numPlayers: number;
    tick: number;
    joinable: boolean;
    activeTick: number;
	closeTick: number;
	actions: Map<string, m.ActionMsg>; // heroId -> actionData
	history: m.TickMsg[];
}

export interface Player {
	socketId: string;
	heroId: string;
    name: string;
}

export interface Room {
    id: string;
    created: moment.Moment;
    numGamesCumulative: number;
    mod: Object;
    allowBots: boolean;
}