export interface Bot {
    act: (input: InputContract) => OutputContract;
}

export interface InputContract {
	heroId: string; // The ID of the hero you are controlling
    cooldowns: CooldownsRemainingContract; // The remaining cooldowns for your hero
    state: WorldContract; // The state of the world
    settings: AcolyteFightSettings; // The current settings for this mod - see acolytefight.d.ts
}

export interface WorldContract {
	tick: number;
	started: boolean; // Whether heroes can take damage yet

	heroes: { [id: string]: HeroContract };
	projectiles: { [id: string]: ProjectileContract };
	obstacles: { [id: string]: ObstacleContract };

	radius: number; // The current radius of the stage
}

export interface WorldObjectContract {
	id: string;
	pos: Vec2;
	velocity: Vec2;
}

export interface HeroContract extends WorldObjectContract {
	isSelf: boolean; // Is the hero you are controlling
	isAlly: boolean;
	isEnemy: boolean;
	health: number; // The current health of the hero (out of 100)
	heading: Vec2; // A unit vector representing the direction the Hero is currently facing
	radius: number; // The radius of the hero
	inside: boolean; // Whether the unit in inside or outside the confines of the map
	linkedToId?: string; // If set, this Hero currently has trapped another Hero in a link. This is the ID of the other Hero (the "victim").
	casting?: CastingContract; // If set, currently casting a channelled spell
	shieldTicksRemaining: number; // The number of ticks that the hero will continue to be shielded for, 0 if unshielded
}

export interface ProjectileContract extends WorldObjectContract {
	ownerId: string;
	spellId: string;

	radius: number;
}

export interface CastingContract {
	spellId: string;
}

export interface CooldownsRemainingContract {
	[spellId: string]: number;
}

export interface ObstacleContract extends WorldObjectContract {
}

export interface OutputContract {
	delayMilliseconds?: number; // Reaction time - number of milliseconds to wait before perform this action. Must be greater than 0.

	// Cast a spell
	spellId?: string;
	target?: Vec2;
	release?: boolean;

	// Change spells
	spells?: KeyBindings;
}