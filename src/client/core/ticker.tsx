import pl from 'planck-js';
import * as m from '../../shared/messages.model';
import * as w from '../../game/world.model';
import * as ai from '../ai/ai';
import * as engine from '../../game/engine';
import * as processor from './processor';
import * as sockets from './sockets';
import * as StoreProvider from '../storeProvider';
import { render, direct, CanvasStack, RenderOptions} from '../graphics/render';
import { TicksPerTurn, TicksPerSecond } from '../../game/constants';
import { notify } from './notifications';
import gameKeyCustomizer from '../play/gameKeyCustomizer';

let tickQueue = new Array<m.TickMsg>();
let incomingQueue = new Array<m.TickMsg>();
let allowedDelay = 1;

export const interval = Math.floor(1000 / TicksPerSecond);
let tickEpoch = Date.now();
let tickCounter = 0;

export function reset(history: m.TickMsg[], live: boolean) {
	if (live) {
		tickQueue = [...history];
		incomingQueue = [];
	} else {
		// Skip to start of game
		tickQueue = [];
		incomingQueue = [...history];

		while (incomingQueue.length > 0 && !processor.isStartGameTick(incomingQueue[0])) {
			tickQueue.push(incomingQueue.shift());
		}
	}
}

function calculateTicksFromCurrentTime() {
	const tickTarget = Math.floor((Date.now() - tickEpoch) / interval);
	if (tickTarget > tickCounter) {
		// Try to handle the fact that the frame rate might not be a perfect multiple of the tick rate
		let numFrames = tickTarget - tickCounter;
		if (numFrames > 4) {
			// Too many frames behind, we probably closed the window or exited a game and started a new one, just proceed at the normal pace
			tickEpoch = Date.now();
			tickCounter = 0;
			numFrames = 1;
		} else {
			tickCounter += numFrames;
		}
		return numFrames;
	} else {
		return 0;
	}
}

function calculateCatchupTicks() {
	const world = StoreProvider.getState().world;

	if (world.ui.live) {
		if (incomingQueue.length === 0) {
			return 0;
		} else if (incomingQueue.length <= TicksPerTurn + allowedDelay) {
			return 0; // We're on time, process at normal rate
		} else if (incomingQueue.length <= TicksPerSecond) {
			return 2; // We're behind, but not by much, catch up slowly
		} else {
			// We're very behind, skip ahead
			return incomingQueue.length;
		}
	} else {
		// Don't catch up to live when watching a replay
		return 0;
	}
}

function queueTicks(numFramesToProcess: number) {
	let unavailable = 0;
	for (let i = 0; i < numFramesToProcess; ++i) {
		if (incomingQueue.length > 0) {
			tickQueue.push(incomingQueue.shift());
		} else {
			++unavailable;
		}
	}
	return unavailable;
}

export function frame(canvasStack: CanvasStack, world: w.World, renderOptions: RenderOptions) {
	const numTicks = Math.max(
		calculateTicksFromCurrentTime(),
		calculateCatchupTicks());
	const unavailable = queueTicks(numTicks);

	while (tickQueue.length > 0 && tickQueue[0].g != world.ui.myGameId) {
		tickQueue.shift(); // Get rid of any leftover ticks from other games
	}

	while (tickQueue.length > 0 && tickQueue[0].t <= world.tick) {
		let tickData = tickQueue.shift();
		if (tickData.t < world.tick) {
			continue; // Received the same tick multiple times, skip over it
		}

		processor.applyTick(tickData, world);

		/*
		const hash = engine.hash(world);
		console.log(`tick ${world.ui.myGameId} ${world.tick} ${hash}`);
		*/
	}

	if (world.finished) {
		// Server is done, tick forward without server messages
		for (let i = 0; i < unavailable; ++i) {
			engine.tick(world);
		}
	}

	direct(world, canvasStack, renderOptions);
	render(world, canvasStack, renderOptions);

	// Don't have to happen in animation frame
	setTimeout(() => sendSnapshot(world), 1);
	setTimeout(() => notificationTick(world), 1);
	setTimeout(() => aiTick(world), 1);
}

function notificationTick(world: w.World) {
	const notifications = engine.takeNotifications(world);
	if (notifications.length > 0) {
		notify(...notifications);
	}
}

function aiTick(world: w.World) {
	ai.onTick(world, {
		action: sendAction,
		spells: sendKeyBindings,
	})
}

export function onTickMsg(data: m.TickMsg) {
	const world = StoreProvider.getState().world;
	if (data.g === world.ui.myGameId) {
		incomingQueue.push(data);
	}
}

function sendSnapshot(world: w.World) {
	if (!(world.ui.myGameId && world.ui.myHeroId && world.snapshots.length > 0)) {
		return;
	}

	const snapshot = world.snapshots[world.snapshots.length - 1];
	if (snapshot.tick <= world.ui.sentSnapshotTick) {
		return;
	}
	world.ui.sentSnapshotTick = snapshot.tick;

	const heroes = new Array<m.ObjectSyncMsg>();
	snapshot.objectLookup.forEach((heroSnapshot, heroId) => {
		heroes.push({
			id: heroId,
			h: heroSnapshot.health,
			x: heroSnapshot.pos.x,
			y: heroSnapshot.pos.y,
		});
	});

	const syncMsg: m.SyncMsg = {
		t: snapshot.tick,
		o: heroes,
	};
	const packet: m.SyncMsgPacket = {
		g: world.ui.myGameId,
		s: syncMsg,
	};

	sockets.getSocket().emit('sync', packet);
}

export function sendAction(gameId: string, heroId: string, action: w.Action, controlKey?: number) {
	const Precision = 1.0 / 1024;

	if (!(gameId && heroId)) {
		return;
	}

	const state = StoreProvider.getState();
	const world = state.world;
	if (!(world.ui.myGameId === gameId && world.objects.has(heroId))) {
		// Don't send any actions for dead heroes
		return;
	}

	const actionMsg: m.ActionMsg = {
		h: heroId,
		type: m.ActionType.GameAction,
		s: action.type,
		x: Math.round(action.target.x / Precision) * Precision,
		y: Math.round(action.target.y / Precision) * Precision,
		r: action.release,
	}

	const packet: m.ActionMsgPacket = {
		g: gameId,
		a: actionMsg,
		c: controlKey || lookupControlKey(heroId),
	};
	send(packet);
}

export function sendKeyBindings(gameId: string, heroId: string, keyBindings: KeyBindings, controlKey?: number) {
	if (!(gameId && heroId)) {
		return;
	}

	const actionMsg: m.ActionMsg = {
		h: heroId,
		type: m.ActionType.Spells,
		keyBindings,
	}

	const packet: m.ActionMsgPacket = {
		g: gameId,
		a: actionMsg,
		c: controlKey || lookupControlKey(heroId),
	};
	send(packet);
}

function lookupControlKey(heroId: string) {
	const state = StoreProvider.getState();
	const world = state.world;
	const player = world.players.get(heroId);
	return player.controlKey;
}

function send(packet: m.ActionMsgPacket) {
	sockets.getSocket().emit('action', packet);
}