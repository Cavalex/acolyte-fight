import _ from 'lodash';
import crypto from 'crypto';
import moment from 'moment';
import uniqid from 'uniqid';
import { Matchmaking, TicksPerSecond, MaxIdleTicks, TicksPerTurn } from '../game/constants';
import * as g from './server.model';
import * as m from '../game/messages.model';
import * as w from '../game/world.model';
import * as auth from './auth';
import * as blacklist from './blacklist';
import * as segments from '../game/segments';
import * as constants from '../game/constants';
import * as gameStorage from './gameStorage';
import * as modder from './modder';
import * as online from './online';
import * as results from './results';
import * as statsStorage from './statsStorage';
import { getStore } from './serverStore';
import { addTickMilliseconds } from './loadMetrics';
import { logger } from './logging';
import { DefaultSettings } from '../game/settings';
import { required, optional } from './schema';

const TeamGameChance = 0.5;

const NanoTimer = require('nanotimer');
const tickTimer = new NanoTimer();

let emitTick: Emitter<m.TickMsg> = null;
let ticksProcessing = false;

const finishedGameListeners = new Array<FinishedGameListener>();

export interface Emitter<T> {
	(data: T): void;
}

export interface FinishedGameListener {
	(game: g.Game, result: m.GameStatsMsg): void;
}

export interface JoinResult {
	heroId: string;
	reconnectKey: string;
}

export function attachToTickEmitter(_emit: Emitter<m.TickMsg>) {
	emitTick = _emit;
}

export function attachFinishedGameListener(listener: FinishedGameListener) {
	finishedGameListeners.push(listener);
}

export function onConnect(socketId: string, authToken: string) {
}

export function onDisconnect(socketId: string, authToken: string) {
	const store = getStore();

	store.activeGames.forEach(game => {
		if (game.active.has(socketId)) {
			leaveGame(game, socketId);
		}
	});
}

function startTickProcessing() {
	if (ticksProcessing) {
		return;
	}
	ticksProcessing = true;

	tickTimer.setInterval(() => {
		const milliseconds = tickTimer.time(() => {
			const running = new Array<g.Game>();
			getStore().activeGames.forEach(game => {
				const isGameRunning = gameTick(game);
				if (isGameRunning) {
					running.push(game);
				}
			});

			online.updateOnlinePlayers(running);

			if (running.length === 0) {
				ticksProcessing = false;
				tickTimer.clearInterval();
				logger.info("Stopped processing ticks");
			}
		}, '', 'm');
		addTickMilliseconds(milliseconds);
	}, '', Math.floor(TicksPerTurn * (1000 / TicksPerSecond)) + 'm');
}

export function findNewGame(version: string, room: g.Room | null, partyId: string | null, isPrivate: boolean, newUserHashes: string[]): g.Game {
	const roomId = room ? room.id : null;
	const segment = segments.calculateSegment(roomId, partyId, isPrivate);
	const store = getStore();

	let numPlayers = 0;
	const scoreboard = store.scoreboards.get(segment);
	if (scoreboard) {
		numPlayers = scoreboard.online.size;
		newUserHashes.forEach(userHash => {
			if (!scoreboard.online.has(userHash)) {
				++numPlayers;
			}
		});
	}

	let openGames = new Array<g.Game>();
	store.joinableGames.forEach(gameId => {
		const g = store.activeGames.get(gameId);
		if (g && g.joinable) {
			if (g.segment === segment && (g.active.size + newUserHashes.length) <= Matchmaking.MaxPlayers) {
				openGames.push(g);
			}
		} else {
			// This entry shouldn't be in here - perhaps it was terminated before it could be removed
			store.joinableGames.delete(gameId);
		}
	});

	const targetPlayersPerGame = numPlayers > Matchmaking.MaxPlayers ? apportionPerGame(numPlayers) : Matchmaking.MaxPlayers;

	let game: g.Game = null;
	if (openGames.length > 0) {
		let minSize = Infinity;
		openGames.forEach(g => {
			const size = g.active.size;
			if (size < Matchmaking.MaxPlayers && size < minSize) {
				minSize = size;
				game = g;
			}
		});
	}
	if (game && game.active.size >= targetPlayersPerGame && openGames.length <= 1) {
		// Start a new game early to stop a single player ending up in the same game
		game = null;
	}

	if (!game) {
		game = initGame(version, room, partyId, isPrivate);
	}
	return game;
}

export function findExistingGame(version: string, room: g.Room | null, partyId: string | null, isPrivate: boolean): g.Game {
	const roomId = room ? room.id : null;
	const segment = segments.calculateSegment(roomId, partyId, isPrivate);
	const store = getStore();

	const candidates = [...store.activeGames.values()].filter(x => x.segment === segment && isGameRunning(x));
	if (candidates.length === 0) {
		return null;
	}

	return _.maxBy(candidates, x => watchPriority(x));
}

function watchPriority(game: g.Game): number {
	if (!(game.active.size && isGameRunning(game))) {
		// Discourage watching finished game
		return 0;
	} else if (game.locked) {
		// Discourage watching locked games
		return game.active.size;
	} else if (game.winTick) {
		// Discourage watching a game which is not live
		return game.active.size;
	} else if (!game.joinable) {
		// Encourage watching a game in-progress
		return 1000 + game.active.size;
	} else {
		// Watch a game that is only starting
		return 100 + game.active.size;
	}
}

export function calculateRoomStats(segment: string): number {
	const scoreboard = getStore().scoreboards.get(segment);
	if (scoreboard) {
		return scoreboard.online.size;
	} else {
		return 0;
	}
}

export function apportionPerGame(totalPlayers: number) {
	// Round up to nearest even number
	return Math.min(Matchmaking.MaxPlayers, Math.ceil(averagePlayersPerGame(totalPlayers) / 2) * 2);
}

export function minPerGame(totalPlayers: number) {
	return Math.floor(averagePlayersPerGame(totalPlayers));
}

export function averagePlayersPerGame(totalPlayers: number) {
	const maxGames = Math.ceil(totalPlayers / Matchmaking.MaxPlayers);
	return totalPlayers / maxGames;
}

export function receiveAction(game: g.Game, data: m.ActionMsg, socketId: string) {
	if (!(
		(
			data.type === "game"
			&& required(data.sid, "string")
			&& required(data.x, "number")
			&& required(data.y, "number")
			&& optional(data.r, "boolean")
		) || (
			data.type === "spells"
			&& required(data.keyBindings, "object")
		) || (
			data.type === m.ActionType.Sync
			&& required(data.tick, "number")
			&& required(data.objects, "object") && data.objects instanceof Array
			&& data.objects.every(snapshot => 
				required(snapshot, "object")
				&& required(snapshot.id, "string")
				&& required(snapshot.hp, "number")
				&& required(snapshot.x, "number")
				&& required(snapshot.y, "number"))
		)
	)) {
		logger.info("Game [" + game.id + "]: action message received from socket " + socketId + " with wrong action type: " + data.type);
		return;
	}

	const player = game.active.get(socketId);
	if (!player) {
		return;
	}

	if (data.hid === player.heroId || takeBotControl(game, data.hid, socketId)) {
		queueAction(game, data);
	}

	if (data.hid === player.heroId) {
		if (data.type === "game") {
			++player.numActionMessages;
		}
	}
}

export function takeBotControl(game: g.Game, heroId: string, socketId: string) {
	const controllerId = game.bots.get(heroId);
	if (controllerId) {
		return socketId === controllerId;
	}

	if (game.active.has(socketId)) {
		game.bots.set(heroId, socketId);
		return true;
	} else {
		return false;
	}
}

export function initGame(version: string, room: g.Room | null, partyId: string | null, isPrivate: boolean, locked: string = null, layoutId: string = null) {
	const store = getStore();
	const roomId = room ? room.id : null;

	const gameIndex = getStore().nextGameId++;
	let game: g.Game = {
		id: uniqid("g" + gameIndex + "-"),
		segment: segments.calculateSegment(roomId, partyId, isPrivate),
		roomId,
		partyId,
		isPrivate,
		mod: room ? room.mod : {},
		created: moment(),
		active: new Map<string, g.Player>(),
		bots: new Map<string, string>(),
		reconnectKeys: new Map<string, string>(),
		playerNames: new Array<string>(),
		isRankedLookup: new Map<string, boolean>(),
		socketIds: new Set<string>(),
		numPlayers: 0,
		winTick: null,
		syncTick: 0,
		scores: new Map<string, m.GameStatsMsg>(),
		tick: 0,
		activeTick: 0,
		joinable: true,
		locked,
		closeTick: Matchmaking.MaxHistoryLength,
		ranked: false,
		actions: new Map<string, m.ActionMsg>(),
		messages: new Array<m.TextMsg>(),
		history: [],
	};
	store.activeGames.set(game.id, game);
	if (!locked) {
		store.joinableGames.add(game.id);
	}
	if (room) {
		room.accessed = moment();
	}

	const heroId = systemHeroId(m.ActionType.Environment);
	game.actions.set(heroId, {
		gid: game.id,
		hid: heroId,
		type: m.ActionType.Environment,
		seed: gameIndex,
		layoutId: layoutId,
	});
	startTickProcessing();

	let gameName = game.id;
	if (room) {
		gameName = room.id + "/" + gameName;
	}
	
	let lockedFormat = "";
	if (locked) {
		lockedFormat = " " + locked;
	}
	logger.info(`Game [${gameName}]: started (${game.segment})${lockedFormat}`);
	return game;
}

export function assignPartyToGames(party: g.Party) {
	const assignments = new Array<g.PartyGameAssignment>();
	const store = getStore();


	const partyHash = crypto.createHash('md5').update(party.id).digest('hex');
	const room = store.rooms.get(party.roomId);
	const remaining = _.shuffle([...party.active.values()].filter(p => p.ready && !p.isObserver));
	const maxPlayersPerGame = apportionPerGame(remaining.length);
	while (remaining.length > 0) {
		const group = new Array<g.PartyMember>();
		for (let i = 0; i < maxPlayersPerGame; ++i) {
			if (remaining.length > 0) {
				const next = remaining.shift();
				group.push(next);
			} else {
				break;
			}
		}

		// Assume all party members on same engine version
		const game = findNewGame(group[0].version, room, party.id, party.isPrivate, group.map(p => p.userHash));
		for (const member of group) {
			const joinParams: g.JoinParameters = { ...member, partyHash };
			const joinResult = joinGame(game, joinParams);
			assignments.push({ partyMember: member, game, ...joinResult });
		}
	}

	if (assignments.length > 0) {
		const observers = [...party.active.values()].filter(p => p.ready && p.isObserver);
		const game = assignments[0].game;
		for (const observer of observers) {
			assignments.push({ game, partyMember: observer, heroId: null, reconnectKey: null });
		}
	}

	return assignments;
}

function formatHeroId(index: number): string {
	return "hero" + index;
}

function queueAction(game: g.Game, actionData: m.ActionMsg) {
	if (actionData.type === m.ActionType.Sync) {
		if (game.syncTick < actionData.tick) {
			game.syncTick = actionData.tick;
			game.actions.set(systemHeroId(m.ActionType.Sync), actionData);
		}
		return;
	}

	let currentPrecedence = actionPrecedence(game.actions.get(actionData.hid));
	let newPrecedence = actionPrecedence(actionData);

	if (newPrecedence >= currentPrecedence) {
		game.actions.set(actionData.hid, actionData);
	}

	startTickProcessing();
}

function actionPrecedence(actionData: m.ActionMsg): number {
	if (!actionData) {
		return 0;
	} else if (actionData.type === "join" || actionData.type === "leave" || actionData.type === "bot") {
		return 1000;
	} else if (actionData.type === "spells") {
		return 101;
	} else if (actionData.type === "game" && actionData.sid === w.Actions.Stop) {
		return 12;
	} else if (actionData.type === "game" && actionData.sid === w.Actions.MoveAndCancel) {
		return 11;
	} else if (actionData.type === "game" && actionData.sid === w.Actions.Move) {
		return 10;
	} else if (actionData.type === "game" && actionData.sid === w.Actions.Retarget) {
		return 1;
	} else if (actionData.type === "game" && actionData.r) {
		// Releasing key less important than casting new spell
		return 99;
	} else {
		// Casting spell
		return 100;
	}
}

function isSpell(actionData: m.ActionMsg): boolean {
	return actionData.type === "game" && !w.Actions.NonGameStarters.some(x => x === actionData.sid);
}

export function receiveScore(game: g.Game, socketId: string, stats: m.GameStatsMsg) {
	game.scores.set(socketId, stats);
	if (game.scores.size >= game.active.size) {
		// Everyone has reported that the game is finished
		game.winTick = game.tick;
		rankGameIfNecessary(game);
	}
}

export function leaveGame(game: g.Game, socketId: string) {
	let player = game.active.get(socketId);
	if (!player) {
		return;
	}

	game.active.delete(socketId);
	reassignBots(game, player.heroId, socketId);

	queueAction(game, { gid: game.id, hid: player.heroId, type: "leave" });

	logger.info("Game [" + game.id + "]: player " + player.name + " [" + socketId + "] left after " + game.tick + " ticks");
}

function reassignBots(game: g.Game, leavingHeroId: string, leftSocketId: string) {
	if (game.active.size === 0) {
		// No one to simulate the bots
		game.bots.clear();
		return;
	}

	const botsToReassign = [leavingHeroId];
	game.bots.forEach((socketId, heroId) => {
		if (socketId === leftSocketId) {
			botsToReassign.push(heroId);
		}
	});
	if (botsToReassign.length === 0) {
		// Nothing to do
		return;
	}

	// Assign to first active player
	const newPlayer = [...game.active.values()][0];
	botsToReassign.forEach(heroId => {
		game.bots.set(heroId, null);
	});
}

function rankGameIfNecessary(game: g.Game) {
	if (!game.winTick) {
		return;
	}

	if (game.ranked) {
		return;
	}
	game.ranked = true;

	let result = results.calculateResult(game);
	if (result) {
		statsStorage.saveGame(game, result).then(newResult => {
			result = newResult || result;

			for (const listener of finishedGameListeners) {
				listener(game, result);
			}
			online.incrementStats(game.segment, result);
		});
	}
}

function finishGameIfNecessary(game: g.Game) {
	if (game.active.size === 0) {
		game.bots.clear();
		getStore().activeGames.delete(game.id);

		gameStorage.saveGame(game);

		logger.info("Game [" + game.id + "]: finished after " + game.tick + " ticks");
		return true;
	} else {
		return false;
	}
}

function gameTick(game: g.Game): boolean {
	let running = isGameRunning(game) || game.actions.size > 0;
	if (running) {
		for (let i = 0; i < TicksPerTurn; ++i) {
			gameTurn(game);
		}
	}

	if (finishGameIfNecessary(game)) {
		running = false;
	}

	return running;
}

function gameTurn(game: g.Game) {
	let data = {
		gameId: game.id,
		tick: game.tick++,
		actions: [...game.actions.values(), ...game.messages],
	} as m.TickMsg;
	if (game.actions.size > 0 || game.messages.length > 0) {
		game.activeTick = game.tick;
	}
	game.actions.clear();
	game.messages.length = 0;

	if (game.history) {
		if (game.history.length < Matchmaking.MaxHistoryLength) {
			game.history.push(data);
		} else {
			game.closeTick = Math.min(game.closeTick, game.tick); // New players cannot join without the full history
		}
	}

	closeGameIfNecessary(game, data);
	emitTick(data);
}

export function isGameRunning(game: g.Game) {
	return (game.tick - game.activeTick) < MaxIdleTicks;
}

export function joinGame(game: g.Game, params: g.JoinParameters): JoinResult {
	leaveGame(game, params.socketId);

	let heroId: string = null;
	if (params.reconnectKey) {
		heroId = game.reconnectKeys.get(params.reconnectKey);
	} else {
		heroId = findExistingSlot(game);
	}

	// No existing slots, create a new one
	const newPlayersAllowed = game.joinable && game.active.size < Matchmaking.MaxPlayers;
	if (!heroId && newPlayersAllowed) {
		heroId = formatHeroId(game.numPlayers++);
	}

	if (!heroId) {
		return null;
	}

	const userHash = params.userHash;
	game.active.set(params.socketId, {
		socketId: params.socketId,
		userHash,
		heroId,
		partyId: null,
		name: params.name,
		unranked: params.unranked,
		numActionMessages: 0,
	});
	game.bots.delete(heroId);
	game.playerNames.push(params.name);

	// Replace reconnectKey
	game.reconnectKeys.forEach((otherHeroId, otherReconnectKey) => {
		if (otherHeroId === heroId) {
			game.reconnectKeys.delete(otherReconnectKey);
		}
	});
	const reconnectKey = uniqid("k-");
	game.reconnectKeys.set(reconnectKey, heroId);

	auth.getUserIdFromAccessKey(auth.enigmaAccessKey(params.authToken)).then(userId => {
		game.isRankedLookup.set(userId, !params.unranked);
		game.socketIds.add(params.socketId);

		const player = game.active.get(params.socketId);
		if (player) {
			player.userId = userId;
			queueAction(game, {
				gid: game.id,
				hid: heroId,
				type: "join",
				userId,
				userHash,
				partyHash: params.partyHash,
				playerName: params.name,
				keyBindings: params.keyBindings,
				isMobile: params.isMobile,
			});
		}
	});

	return { heroId, reconnectKey };
}

export function addBot(game: g.Game) {
	if (game.numPlayers >= Matchmaking.MaxPlayers || game.active.size === 0 || !game.joinable) {
		return null;
	}

	const replaceBots = false;
	const heroId = findExistingSlot(game, replaceBots) || formatHeroId(game.numPlayers++);

	game.bots.set(heroId, null);

	const keyBindings = randomKeyBindings(game);
	queueAction(game, { gid: game.id, hid: heroId, type: "bot", keyBindings });

	return heroId;
}

function randomKeyBindings(game: g.Game): KeyBindings {
	const keyBindings: KeyBindings = {};
	const allOptions = DefaultSettings.Choices.Options
	for (const key in allOptions) {
		const options = _.flatten(allOptions[key]);
		if (options.length > 1) {
			keyBindings[key] = options[Math.floor(Math.random() * options.length)];
		}
	}
	return keyBindings;
}

function findExistingSlot(game: g.Game, replaceBots: boolean = true): string {
	// Take an existing slot, if possible
	let activeHeroIds = new Set<string>([...game.active.values()].map(x => x.heroId));
	if (!replaceBots) {
		[...game.bots.keys()].forEach(heroId => activeHeroIds.add(heroId));
	}

	for (let i = 0; i < game.numPlayers; ++i) {
		let candidate = formatHeroId(i);
		if (!activeHeroIds.has(candidate)) {
			return candidate;
		}
	}
	return null;
}

function closeGameIfNecessary(game: g.Game, data: m.TickMsg) {
	if (!game.joinable) {
		return;
	}

	let waitPeriod: number = null;
	let numTeams: number = null;

	const numPlayers = game.active.size + game.bots.size;
	if (numPlayers > 1 && data.actions.some(action => isSpell(action))) {
		// Casting any spell closes the game
		const joinPeriod = calculateJoinPeriod(game.segment, game.active.size, game.locked);

		const newCloseTick = game.tick + joinPeriod;
		if (newCloseTick < game.closeTick) {
			game.closeTick = newCloseTick;
			waitPeriod = joinPeriod;
		}
	}

	if (game.tick >= game.closeTick) {
		if (game.bots.size === 0 && [...game.active.values()].every(x => !!x.userId)) {
			// Everyone must be logged in to activate team mode
			if (numPlayers >= 4 && Math.random() < TeamGameChance) {
				const candidates = new Array<number>();
				for (let candidateTeams = 2; candidateTeams <= numPlayers / 2; ++candidateTeams) {
					if ((numPlayers % candidateTeams) === 0) {
						candidates.push(candidateTeams);
					}
				}
				if (candidates.length > 0) {
					numTeams = candidates[Math.floor(Math.random() * candidates.length)];
				}
			}
		}

		getStore().joinableGames.delete(game.id);
		game.joinable = false;
		waitPeriod = 0;
		logger.info("Game [" + game.id + "]: now unjoinable with " + game.active.size + " players (" + (numTeams || 1) + " teams) after " + game.tick + " ticks");
	}

	if (waitPeriod !== null) {
		queueAction(game, {
			gid: game.id,
			hid: systemHeroId(m.ActionType.CloseGame),
			type: m.ActionType.CloseGame,
			closeTick: game.closeTick,
			waitPeriod,
			numTeams,
		});
	}
}

function calculateJoinPeriod(segment: string, numHumans: number, locked: string): number {
	if (locked) {
		return Matchmaking.JoinPeriod;
	}

	const numInRoom = calculateRoomStats(segment);
	const targetPerGame = minPerGame(numInRoom);

	if (numHumans < targetPerGame) {
		return Matchmaking.WaitForMorePeriod;
	} else {
		return Matchmaking.JoinPeriod;
	}
}

function systemHeroId(actionType: string) {
	return "_" + actionType;
}