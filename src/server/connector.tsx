import moment from 'moment';
import { Matchmaking, TicksPerSecond, Spells, World } from '../game/constants';
import * as _ from 'lodash';
import * as c from '../game/world.model';
import * as g from './server.model';
import * as m from '../game/messages.model';
import * as PlayerName from '../game/playerName';
import { getStore } from './games';
import { logger } from './logging';

const NanoTimer = require('nanotimer');

const tickTimer = new NanoTimer();
tickTimer.setInterval(tickAllGames, '', Math.floor(1e9 / TicksPerSecond) + 'n');

let io: SocketIO.Server = null;

export function attachToSocket(_io: SocketIO.Server ) {
    io = _io;
    io.on('connection', onConnection);
}

function getServerStats(): m.ServerStats {
	let numGames = 0;
	let numPlayers = 0;
	getStore().activeGames.forEach(game => {
		++numGames;
		numPlayers += game.active.size;
	});
	return { numGames, numPlayers };
}

function tickAllGames() {
	getStore().activeGames.forEach(game => gameTick(game));
}

function onConnection(socket: SocketIO.Socket) {
  logger.info("user " + socket.id + " connected");

	socket.on('disconnect', () => {
		logger.info("user " + socket.id + " disconnected");

		getStore().activeGames.forEach(game => {
			if (game.active.has(socket.id)) {
				leaveGame(game, socket);
			}
		});
	});

	socket.on('join', data => onJoinGameMsg(socket, data));
	socket.on('leave', data => onLeaveGameMsg(socket, data));
	socket.on('watch', data => onWatchGameMsg(socket, data));
	socket.on('action', data => onActionMsg(socket, data));
}

function onWatchGameMsg(socket: SocketIO.Socket, data: m.WatchMsg) {
    const store = getStore();
	if (store.activeGames.has(data.gameId)) {
		const game = store.activeGames.get(data.gameId);
		logger.info("Game [" + game.id + "]: " + data.name + " joined as observer");

		socket.emit("watch", {
			gameId: game.id,
			history: game.history,
			serverStats: getServerStats(),
		} as m.HeroMsg);

		socket.join(game.id);
	} else if (store.inactiveGames.has(data.gameId)) {
		const game = store.inactiveGames.get(data.gameId);
		logger.info("Game [" + game.id + "]: going to be watched by " + data.name);

		socket.emit("watch", {
			gameId: game.id,
			history: game.history,
			serverStats: getServerStats(),
		} as m.WatchResponseMsg);
	} else {
		logger.info("Game [" + data.gameId + "]: unable to find game for " + data.name);

		socket.emit("watch", {
			gameId: data.gameId,
			history: null,
			serverStats: getServerStats(),
		} as m.WatchResponseMsg);
	}
}

function onJoinGameMsg(socket: SocketIO.Socket, data: m.JoinMsg) {
	let game: g.Game = null;
	getStore().activeGames.forEach(g => {
		if (g.joinable && g.active.size < Matchmaking.MaxPlayers) {
			game = g;
		}
	});
	if (!game) {
		game = initGame();
	}
	
	joinGame(game, PlayerName.sanitizeName(data.name), data.keyBindings, socket);
}

function onLeaveGameMsg(socket: SocketIO.Socket, data: m.LeaveMsg) {
	const game = getStore().activeGames.get(data.gameId);
	if (!game) {
		return;
	}

	leaveGame(game, socket);
}

function onActionMsg(socket: SocketIO.Socket, data: m.ActionMsg) {
	const game = getStore().activeGames.get(data.gameId);
	if (!game) {
		return;
	}

	if (data.actionType !== "game") {
		logger.info("Game [" + game.id + "]: action message received from socket " + socket.id + " with wrong action type: " + data.actionType);
		return;
	}

	const player = game.active.get(socket.id);
	if (!player) {
		return;
	}

	if (data.heroId !== player.heroId) {
		logger.info("Game [" + game.id + "]: incorrect hero id from socket " + socket.id + " - received " + data.heroId + " should be " + player.heroId);
		return;
	}

	queueAction(game, data);
}

function initGame() {
	const gameIndex = getStore().nextGameId++;
	let game: g.Game = {
		id: "g" + gameIndex + "-" + Math.floor(Math.random() * 1e9).toString(36),
		created: moment(),
		active: new Map<string, g.Player>(),
		playerNames: new Array<string>(),
		started: false,
		numPlayers: 0,
		tick: 0,
		joinable: true,
		closeTick: Matchmaking.MaxHistoryLength,
		actions: new Map<string, m.ActionMsg>(),
		history: [],
	};
	getStore().activeGames.set(game.id, game);

	const heroId = systemHeroId(m.ActionType.Environment);
	game.actions.set(heroId, {
		gameId: game.id,
		heroId,
		actionType: m.ActionType.Environment,
		seed: gameIndex,
	});

	logger.info("Game [" + game.id + "]: started");
	return game;
}

function formatHeroId(index: number): string {
	return "hero" + index;
}

function queueAction(game: g.Game, actionData: m.ActionMsg) {
	let currentPrecedence = actionPrecedence(game.actions.get(actionData.heroId));
	let newPrecedence = actionPrecedence(actionData);

	if (newPrecedence >= currentPrecedence) {
		game.actions.set(actionData.heroId, actionData);
	}

	if (!game.started && isUserInitiated(actionData)) {
		game.started = true;
		logger.info("Started game " + game.id + " with " + game.numPlayers + " players");
	}

	// logger.info("Game [" + game.id + "]: action received", actionData);
}

function actionPrecedence(actionData: m.ActionMsg): number {
	if (!actionData) {
		return 0;
	} else if (actionData.actionType === "leave") {
		return 1001;
	} else if (actionData.actionType === "join") {
		return 1000;
	} else if (actionData.actionType === "game" && actionData.spellId === Spells.move.id) {
		return 10;
	} else {
		return 100;
	}
}

function isUserInitiated(actionData: m.ActionMsg): boolean {
	return actionData.actionType === "game";
}

function isSpell(actionData: m.ActionMsg): boolean {
	return actionData.actionType === "game" && actionData.spellId !== Spells.move.id;
}

function leaveGame(game: g.Game, socket: SocketIO.Socket) {
	let player = game.active.get(socket.id);
	if (!player) {
		logger.info("Game [" + game.id + "]: player " + socket.id + " tried to leave but was not in the game");
		return;
	}

	queueAction(game, { gameId: game.id, heroId: player.heroId, actionType: "leave" });

	game.active.delete(socket.id);
	socket.leave(game.id);
	logger.info("Game [" + game.id + "]: player " + player.name + " [" + socket.id + "] left after " + game.tick + " ticks");
}

function finishGame(game: g.Game) {
	getStore().activeGames.delete(game.id);
	getStore().inactiveGames.set(game.id, game);

	logger.info("Game [" + game.id + "]: finished after " + game.tick + " ticks");
}

function gameTick(game: g.Game) {
	if (game.active.size === 0) {
		finishGame(game);
		return;
	}

	if (game.started || game.actions.size > 0) {
		let data = {
			gameId: game.id,
			tick: game.tick++,
			actions: [...game.actions.values()],
		} as m.TickMsg;
		game.actions.clear();

		if (game.history) {
			if (game.history.length < Matchmaking.MaxHistoryLength) {
				game.history.push(data);
			} else {
				game.closeTick = Math.min(game.closeTick, game.tick); // New players cannot join without the full history
			}
		}

		closeGameIfNecessary(game, data);
		io.to(game.id).emit('tick', data);
	}
}

function joinGame(game: g.Game, playerName: string, keyBindings: c.KeyBindings, socket: SocketIO.Socket) {
	let heroId: string = null;

	// Take an existing slot, if possible
	let activeHeroIds = new Set<string>(mapMap(game.active, x => x.heroId));
	for (let i = 0; i < game.numPlayers; ++i) {
		let candidate = formatHeroId(i);
		if (!activeHeroIds.has(candidate)) {
			heroId = candidate;
			break;
		}
	}

	// No existing slots, create a new one
	if (!heroId) {
		heroId = formatHeroId(game.numPlayers++);
	}

	game.active.set(socket.id, {
		socketId: socket.id,
		heroId,
		name: playerName,
	});
	game.playerNames.push(playerName);
	socket.join(game.id);

	socket.emit("hero", {
		gameId: game.id,
		heroId,
		history: game.history,
		serverStats: getServerStats(),
	} as m.HeroMsg);

	queueAction(game, { gameId: game.id, heroId, actionType: "join", playerName, keyBindings });

	logger.info("Game [" + game.id + "]: player " + playerName + " [" + socket.id + "] joined, now " + game.numPlayers + " players");

	return heroId;
}


function closeGameIfNecessary(game: g.Game, data: m.TickMsg) {
	if (!game.joinable) {
		return;
	}

	let statusChanged = false;

	if ((game.active.size > 1 && _.some(data.actions, action => isSpell(action)))
		|| game.active.size >= Matchmaking.MaxPlayers) {

		// Casting any spell closes the game
		const newCloseTick = game.tick + Matchmaking.JoinPeriod;
		if (newCloseTick < game.closeTick) {
			game.closeTick = newCloseTick;
			statusChanged = true;
		}
	}

	if (game.tick >= game.closeTick) {
		game.joinable = false;
		statusChanged = true;
		logger.info("Game [" + game.id + "]: now unjoinable with " + game.numPlayers + " players after " + game.tick + " ticks");
	}

	if (statusChanged) {
		queueAction(game, {
			gameId: game.id,
			heroId: systemHeroId(m.ActionType.CloseGame),
			actionType: m.ActionType.CloseGame,
			closeTick: game.closeTick,
		});
	}
}

function systemHeroId(actionType: string) {
	return "_" + actionType;
}

function mapMap<K, V, Out>(map : Map<K, V>, func: (v: V) => Out) {
	let result = new Array<Out>();
	map.forEach(value => result.push(func(value)));
	return result;
}