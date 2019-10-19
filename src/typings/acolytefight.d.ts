/*

Units - general conventions:
* Distance: If you're on a horizontal monitor, the distance from the top of the screen to the bottom is 1.0.
* Time: Either ticks or seconds. There are 60 ticks per second.
* Speed: Distance per second.
* Angles: Revolutions. e.g. maxAngleDiff: 0.25 means the spell can be cast when the acolyte is one quarter-turn away from facing the target directly.
* Angular speeds: Revolutions per second.
* Health: Percentages. Heroes start with 100.
* Lifesteal: Fraction of damage translated into lifesteal. e.g. 1.0 for drain, 0.5 for link.
* Densities, forces, impulses: These are a bit arbitrary and don't really have units. Heroes have a density of 0.5 and everything has been set relative to that.

The collision and alliance flags are bitmasks: https://en.wikipedia.org/wiki/Mask_(computing)

Collision category flags (categories, expireOn and collideWith):
* All = 0xFFFF
* Hero = 0x1
* Projectile = 0x2
* Massive = 0x4
* Obstacle = 0x8
* Shield = 0x10
* Blocker = 0x20 // all projectiles except Fireball/Fireboom are solid
* None = 0

Alliance flags (against, expireAgainstHeroes, expireAgainstObjects):
* Self = 0x01
* Ally = 0x02
* Enemy = 0x04
* Neutral = 0x08

*/

declare interface AcolyteFightSettings {
	Mod: ModSettings;
	Matchmaking: MatchmakingSettings;
	Layouts: Layouts;
    Hero: HeroSettings;
    World: WorldSettings;
	Obstacle: ObstacleSettings;
	ObstacleTemplates: ObstacleTemplateLookup;
    Spells: Spells;
	Choices: ChoiceSettings;
	Sounds: Sounds;
	Visuals: VisualSettings;
	Icons: IconLookup;
	Code: string;
}

declare type ModTree = {
	[K in keyof AcolyteFightSettings]?: any;
}

declare interface ModSettings {
	name: string;
	author: string;
	description: string;

	titleLeft: string; // On the homepage, this text flies in from left
	titleRight: string; // On the homepage, this text flies in from right
}

declare interface HeroSettings {
	MoveSpeedPerSecond: number;
	MaxSpeed: number; // Limit speed - corrects some physics engine errors which can speed up the hero and eject them from the map uncontrollably
    Radius: number;
    Density: number;

    AngularDamping: number;
	Damping: number; // How quickly knockback decayed. Higher number, faster decay.
	
	DamageMitigationTicks: number; // Within these many ticks, damage does not stack between multiple players

	ThrottleTicks: number; // Within these many ticks, disallow multiple spells to be cast by the same hero

    MaxHealth: number;
    SeparationImpulsePerTick: number; // The force which stops heroes going inside each other

	RevolutionsPerTick: number; // Hero turn rate

	InitialStaticSeconds: number; // How many seconds a new player at the start of the game that a player cannot be knocked back
}

declare interface WorldSettings {
	InitialRadius: number; // Initial radius of the world
	HeroLayoutProportion: number; // The radius at which to place heroes - 1 means edge of map, 0 means at center

	LavaLifestealProportion: number; // 0 for no lifesteal, 1 for 100% lifesteal
	LavaDamagePerSecond: number;
	LavaDamageInterval: number; // Ticks between applying lava damage

	SecondsToShrink: number;
	ShrinkPowerMinPlayers: number; // Make the shrinking non-linear. Higher values mean faster shrinking at the start of the game.
	ShrinkPowerMaxPlayers: number;
	
	ProjectileSpeedDecayFactorPerTick: number; // If a projectile is going faster or slower than its intended speed, correct it by this proportion per tick

	SwatchHealth: number; // How quickly does a swatch (e.g. a boost pad) die in the void?

	SlopSpeed: number; // Performance improvement: When performing speed adjustments, if the speed is within this value consider it equal
	SlopRadius: number; // Performance improvement: For detonate, sabers, auras, attracts, etc to collide correctly, no object must be larger than this radius.

	BotName: string; // What to call the bot

	Layouts?: string[]; // Only allow this subset of layouts to be played. Used internally to preview a single map.
}

declare interface MatchmakingSettings {
	MinBots: number; // minimum number of bots to add when Play vs AI clicked
	MaxBots: number; // maximum number of bots to add when Play vs AI clicked
	MaxPlayers: number; // Maximum number of players in one game

	AllowBotTeams: boolean; // Allow teams even when bots are in the game
	BotRating: number; // If the bot is being matched into teams, consider it to be a player with this rating

	RatingPower: number; // Higher means the matchmaker will try harder to match players of similar skill and there will be less random variation
	OddPenalty: number; // Discourage non-even splits by this proportion
}

declare interface Layouts {
    [name: string]: Layout;
}

declare interface Layout {
	color?: string; // Color of the map
	background?: string; // Color of the void
	obstacles: ObstacleLayout[];
	numPoints?: number; // Number of points to this layout, defaults to zero (circle)
	angleOffsetInRevs?: number; // Rotate the map by this angle, defaults to zero
	radiusMultiplier?: number; // Change the radius of the world by this proportion, defaults to 1.0
}

declare interface ObstacleLayout {
	// Properties
	type?: string;
	health?: number;

	// Layout
	numObstacles: number;
	layoutRadius: number;
	layoutAngleOffsetInRevs?: number;
	pattern?: number[];

	// Individual obstacle
	numPoints?: number; // Make this a rotationally-symmetric polygon, otherwise make this an arc
	extent: number; // aka radius but for a polygon
	orientationAngleOffsetInRevs?: number; // Rotate the shape
	angularWidthInRevs?: number; // For trapezoid or arcs
}

declare type SwatchRender =
	SwatchFill
	| SwatchBloom
	| SwatchSmoke

declare interface SwatchColor {
	color: string;
	deadColor?: string;
	flash?: boolean; // Whether to flash when obstacle hit. Defaults to true.
}

declare interface SwatchFill extends SwatchColor {
	type: "solid";

	expand?: number;
	glow?: number;
	bloom?: number
	shadow?: boolean; // Apply shadow offset and shadow feather to fill
}

declare interface SwatchBloom extends SwatchColor {
	type: "bloom";

	glow?: number;
	bloom?: number
	strikeOnly?: boolean;
}

declare interface SwatchSmoke {
	type: "smoke";

	color: string;
	particleRadius: number;

	shine?: number;
	fade?: string;
	glow?: number;
	bloom?: number;
	vanish?: number;

	ticks: number;
	interval?: number;
	speed: number;
	conveyor?: number; // 1 means move at the same speed as the conveyor, 0.5 means half speed, etc
}

declare interface ObstacleSettings {
	AngularDamping: number;
	LinearDamping: number;
	Density: number;

	// These values control how quickly obstacles return to their initial positions before the game starts
	ReturnProportion: number;
	ReturnMinSpeed: number;
	ReturnTurnRate: number;
}

declare interface ObstacleTemplateLookup {
	[key: string]: ObstacleTemplate;
}

declare interface ObstacleTemplate {
	render?: SwatchRender[];
	strike?: RenderStrikeParams;
	sound?: string;

	static?: boolean; // Whether this obstacle is movable
	angularDamping?: number;
	linearDamping?: number;
	density?: number;

	sensor?: boolean; // Whether other objects (e.g. projectiles) pass through this obstacle
	collideWith?: number;
	expireOn?: number;
	undamageable?: boolean; // Whether projectiles or detonations can damage this obstacle
	circularHitbox?: boolean; // For physics, ignore the shape of the polygon, just it a circular hitbox so it is easier to predict how it will move

	health: number;

	hitInterval?: number; // How many ticks between reapplying the buffs
	damage?: number;
	buffs?: BuffTemplate[];
	detonate?: DetonateParametersTemplate;
	mirror?: boolean;
	impulse?: number;
	conveyor?: ConveyorParameters;
}

declare interface ConveyorParameters {
	radialSpeed?: number;
	lateralSpeed?: number;
}

declare interface ChoiceSettings {
	Keys: KeyConfig[];
	Options: KeyBindingOptions;
	Special: KeyBindings;
}

declare interface KeyConfig {
	btn: string;
	barSize?: number;
	wheelSize?: number;
}

declare interface Spells {
    [key: string]: Spell;
}

declare type Spell =
	MoveSpell
	| StopSpell
	| RetargetSpell
	| BuffSpell
	| ChargingSpell
	| ProjectileSpell
	| ReflectSpell
	| FocusSpell
	| SaberSpell
	| SpraySpell
	| ScourgeSpell
	| TeleportSpell
	| ThrustSpell
	| WallSpell

declare interface SpellBase {
	id: string;
	name?: string;
	description: string;
	effects?: EffectInfo[]; // Only used for display purposes

	action: string; // Which action function to use
	sound?: string; // Which sound to use for charging/channelling
	untargeted?: boolean; // No target required. i.e. cast instantly when you click the button
	passive?: boolean; // Apply the buffs immediately

	maxAngleDiffInRevs?: number; // How much does the acolyte have to turn to face the target?

	unlink?: boolean; // When this spell is cast, remove any links which I own
	debuff?: boolean; // When this spell is cast, remove all buffs
	throttle?: boolean; // Don't allow throttled spells to be cast too quickly
	chargeTicks?: number; // The number of ticks of charge-up time before casting the spell
	release?: ReleaseParams; // If set, the spell will track the release of the button. Behaviour depends on the type of spell.
	movementProportionWhileCharging?: number; // Proportion of movement to allow during the charge-up time
	movementProportionWhileChannelling?: number; // Proportion of movement to allow during the channelling of the spell
	revsPerTickWhileCharging?: number; // If set, defines how quickly the hero can orient themselves towards the cursor while charging
	revsPerTickWhileChannelling?: number; // If set, defines how quickly the hero can orient themselves towards the cursor while channelling
    cooldown: number;
    interruptibleAfterTicks?: number; // Cannot interrupt a spell until it has been channeling for at least this length
    movementCancel?: boolean; // Whether moving cancels the spell.
	strikeCancel?: SpellCancelParams; // If this spell is being channelled, whether being hit by something cancels it.
	
	chargeBuffs?: BuffTemplate[]; // Apply these buffs at the start of charging the spell
	buffs?: BuffTemplate[]; // Apply these buffs at the start of channelling the spell

    icon?: string;

	color: string; // The colour of the button for this spell (not the projectile)
	glow?: number; // 0 means no glow, 1 means full glow around acolyte when casting
}

declare interface EffectInfo {
	icon: string; // Font awesome or RPG awesome class: see https://fontawesome.com/icons or https://nagoshiashumari.github.io/Rpg-Awesome/
	title: string;
	text: string;
}

declare interface ReleaseParams {
	maxChargeTicks?: number; // Don't finish charging until button is released or until this number of ticks
	interrupt?: boolean; // Whether releasing the button interrupts the spell
	interruptibleAfterTicks?: number; // Cannot interrupt a spell until it has been channeling for at least this length
}

declare interface SpellCancelParams {
	cooldownTicks?: number; // If cancelled by knockback, set cooldown to this value. This can be used to allow the spell to be re-cast quickly if interrupted.
	maxChannelingTicks?: number; // Only apply the cooldown reset if have been channelling for less than this time.
}

declare interface MoveSpell extends SpellBase {
	action: "move";
	cancelChanneling: boolean;
}

declare interface StopSpell extends SpellBase {
    action: "stop";
}

declare interface RetargetSpell extends SpellBase {
    action: "retarget";
}

declare interface ProjectileSpell extends SpellBase {
    action: "projectile";

	projectile: ProjectileTemplate;
}

declare interface SpraySpell extends SpellBase {
    action: "spray";

	projectile: ProjectileTemplate;

	maxChannellingTicks?: number; // Keep channelling until this many ticks has been reached

	numProjectilesPerTick?: number; // Number of projectiles to shoot per tick. Defaults to 1.
    intervalTicks: number; // Spray shoots a new projectile every intervalTicks
    lengthTicks: number; // Spray continues creating new projectiles until lengthTicks has passed
	jitterRatio: number; // The spread of the spray. 1.0 means it should go out to 90 degrees either side. Weird units, I know.
}

declare interface ChargingSpell extends SpellBase {
    action: "charge";

	projectile: ProjectileTemplate;
	retarget?: boolean; // If the charging takes a while, use the player's latest cursor position as the target, not the initial cursor position

	chargeDamage?: PartialDamageParameters; // Scale damage with charge time
	chargeRadius?: PartialDamageParameters; // Scale projectile radius with charge time
	chargeImpulse?: PartialDamageParameters; // Scale detonation knockback with charge time
}

declare interface FocusSpell extends SpellBase {
	action: "focus";
	
	projectile: ProjectileTemplate;

	focusDelaysCooldown?: boolean; // Whether to delay the cooldown until focusing is complete
	releaseBehaviours?: BehaviourTemplate[]; // Add these behaviours to the projectile when button is released. Must also specify the release property so the UI sends the release signal.
	maxChannellingTicks?: number; // Keep channelling until this many ticks has been reached
}

declare interface ProjectileTemplate extends DamagePacketTemplate {
	damage: number;
	damageScaling?: boolean; // Whether to apply damage scaling to this projectile
	knockbackScaling?: boolean; // Increase knockback as acolyte gets more powerful

	partialDamage?: PartialDamageParameters; // Scale damage over time
	partialDetonateRadius?: PartialDamageParameters; // Scale detonate radius over time, only useful if detonate set
	partialDetonateImpulse?: PartialDamageParameters; // Scale detonate impulse over time, only useful if detonate set
	partialBuffDuration?: PartialDamageParameters; // Scale buff durations over time, only useful if buffs set

	ccd?: boolean; // Performance improvement: Whether to apply continuous collision detection to this projectile. Small and fast projectiles will tunnel through other objects unless CCD is on. Defaults to true.
	density: number;
    radius: number;
	speed: number;
	fixedSpeed?: boolean; // if true or undefined, the projectile's speed will be corrected according to ProjectileSpeedDecayFactorPerTick if it becomes faster or slower due to collisions
	restitution?: number; // 1 means very bouncy, 0 means not bouncy
	attractable?: boolean; // Whether the "attract" behaviour (e.g. a whirlwind) can affect this projectile
	swappable?: boolean; // Whether this projectile can be swapped with
	bumpable?: boolean; // Whether this projectile gets knocked back by a bumper obstacle
	conveyable?: boolean; // Whether this projectile is moved by a conveyor belt. (Collision flags must allow the projectile collide with obstacles to work.)
	linkable?: boolean; // Whether a link can attach to this projectile

	hitInterval?: number; // If set, the projectile is allowed to hit enemies multiple times, as long as the ticks between hits is at least this number
    bounce?: BounceParameters;
	link?: LinkParameters;
	horcrux?: HorcruxParameters;
	detonate?: DetonateParametersTemplate;
	gravity?: GravityParameters; // Trap a hero
	swapWith?: number; // Category flags of what types of objects to swap with
	lifeSteal?: number; // 1.0 means all damage is returned as health to the owner of the projectile

	buffs?: BuffTemplate[];
	behaviours?: BehaviourTemplate[],

	minTicks?: number; // The minimum number of ticks that a projectile will live for. The main purpose of this is to work around a quirk in the physics engine where if projectiles doesn't live for more than 1 tick, it doesn't affect the physics.
	maxTicks: number; // The maximum number of ticks that a projectile will live for. The maximum range can be determined by speed * maxTicks / TicksPerSecond.
	categories?: number; // Collision flags: What flags this object has
	collideWith?: number; // Collision flags: Which other objects to collide with
	expireOn?: number; // Collision flags: The projectile will expire if it hits any of these objects
	expireAgainstHeroes?: number; // Alliance flags: Whether to expire against enemies only, etc
	expireAgainstObjects?: number; // Alliance flags: Whether to expire against enemies only, etc
	expireOnMirror?: boolean; // Whether to hit mirrors or not
	sensor?: boolean; // A sensor will just pass through all objects and report what it would have collided with
	sense?: number; // Collision flags: Detect when we pass over these objects - different from sensor in that the object can still collide with some things while sensing others
	selfPassthrough?: boolean; // Whether the projectile just passes through its owner
	destructible?: DestructibleParameters; // Whether this projectile is destroyed by a detonate (like a Supernova)
	expireAfterCursorTicks?: number; // Expire this many ticks after the cursor is reached
	shieldTakesOwnership?: boolean; // If the projectile hits a shield, does it switch owner?

	color: string;
	renderers: RenderParams[]; // Which render function to use
	sound?: string;
	soundHit?: string;
}

declare interface DestructibleParameters {
	against?: number; // who can destroy this projectile?
}

declare interface PartialDamageParameters {
	initialMultiplier: number; // Initially, the projectile initially does this multiplier
	ticks: number; // The projectile grows to full damage when it reaches this lifetime
	step?: boolean; // Grow from initial to full damage at ticks in one step, rather than linear growth
}

declare interface GravityParameters {
	ticks: number; // How long the trap lasts for
	impulsePerTick: number; // Force to apply each tick to a trapped hero (pre-scaling)
	radius: number; // Scale factor: The force scales to zero at this radius
	power: number; // Scale factor: The power curve to apply to the scaling
	render?: RenderSwirl; // What to render when a hero is caught in gravity
}

declare interface BounceParameters {
	cleanseable?: boolean; // If the target player casts a cleanse (like teleport), stop bouncing towards them
}

declare interface HorcruxParameters {
}

declare type BehaviourTemplate =
	HomingTemplate
	| AccelerateTemplate
	| AttractTemplate
	| AuraTemplate
	| StrafeTemplate
	| UpdateCollideWithTemplate
	| ClearHitsTemplate
	| ExpireOnOwnerDeathTemplate
	| ExpireOnOwnerRetreatTemplate
	| ExpireOnChannellingEndTemplate

declare type HomingType =
	"self" // Home towards the owner (e.g. for self-orbiting projectiles)
	| "enemy" // Home towards the enemy
	| "cursor" // Home towards where the user initially clicked when they shot this projectile
	| "follow" // Home towards where the user's mouse is right now

declare interface BehaviourTemplateBase {
	type: string;
	trigger?: BehaviourTrigger;
}

declare interface BehaviourTrigger {
	afterTicks?: number; // After this many ticks
	atCursor?: boolean; // When projectile reaches cursor
	minTicks?: number; // Don't trigger at cursor until this many ticks have passed
}

declare interface HomingTemplate extends BehaviourTemplateBase {
	type: "homing";

	targetType?: HomingType; // Whether to home towards "self", "enemy", "cursor" or "follow". Defaults to "enemy".

	revolutionsPerSecond?: number; // The maximum turn rate of the homing projectile. Defaults to infinity
	maxTurnProportion?: number; // The turn rate cannot be more than this proportion of the difference between ideal and current angle. Used to make homing spells dodgeable.
	expireWithinRevs?: number; // Stop homing once within this many revs of aiming directly at the target

	minDistanceToTarget?: number; // Homing is only applied if the projectile is further than this. Used to keep projectiles orbiting at a particular distance.
	maxDistanceToTarget?: number; // Homing is only applied if the projectile is closer than this.

	newSpeed?: number; // Update the speed of the projectile while we're redirecting it.
	maxTicks?: number; // Only perform homing for this many ticks
	redirect?: boolean; // If true, this homing will only redirect the projectile one time
}

declare interface AccelerateTemplate extends BehaviourTemplateBase {
	type: "accelerate";

	maxSpeed: number;
	accelerationPerSecond: number; // Add this amount to the projectile speed every second
}

declare interface AttractTemplate extends BehaviourTemplateBase {
	type: "attract";

	against?: number; // Which alliances to attract
	collideLike: number; // Only attract other objects which would collide with this. e.g. collide with them like we're a hero
	categories: number; // What types of objects to attract
	notCategories?: number; // What types of objects to not attract
	radius: number; // Maximum range of attraction
	accelerationPerTick: number; // Acceleration per tick
	maxSpeed?: number; // Slow down anything caught in the attraction
}

declare interface AuraTemplate extends BehaviourTemplateBase {
	type: "aura";

	against?: number;
	radius: number; // Maximum range of aura
	tickInterval: number; // Interval between when to apply the buff
	maxHits?: number;
	packet?: DamagePacketTemplate;
	buffs: BuffTemplate[]; // Buffs to apply
}

declare interface StrafeTemplate extends BehaviourTemplateBase {
	// Make this projectile follow the movements of its owner
	type: "strafe";
	maxSpeed?: number; // Cannot follow faster than this speed
}

declare interface UpdateCollideWithTemplate extends BehaviourTemplateBase {
	type: "updateCollideWith";

	collideWith: number;
}

declare interface ClearHitsTemplate extends BehaviourTemplateBase {
	type: "clearHits";
}

declare interface ExpireOnOwnerDeathTemplate extends BehaviourTemplateBase {
	type: "expireOnOwnerDeath";
}

declare interface ExpireOnOwnerRetreatTemplate extends BehaviourTemplateBase {
	type: "expireOnOwnerRetreat";
	maxDistance: number;
}
declare interface ExpireOnChannellingEndTemplate extends BehaviourTemplateBase {
	type: "expireOnChannellingEnd";
}

declare interface DetonateParametersTemplate extends DamagePacketTemplate {
	against?: number; // Alliance flags

	radius: number; // The radius of the explosion
	
	minImpulse: number; // The outer rim of the explosion will cause this much knockback
	maxImpulse: number; // The epicenter of the explosion will cause this much knockback
	knockbackScaling?: boolean; // Increase knockback as acolyte gets more powerful

	renderTicks: number; // Length of explosion
	sound?: string;

	buffs?: BuffTemplate[];
}

declare type RenderParams =
	RenderRay
	| RenderProjectile
	| RenderPolygon
	| RenderSwirl
	| RenderLink
	| RenderReticule
	| RenderStrike
	| RenderBloom

declare interface RenderParamsBase {
	type: string;
}

declare interface ProjectileColorParams {
    color?: string; // Override the color of the projectile
	selfColor?: boolean; // Give the projectile the owner's colour, so they can tell it's theirs
	ownerColor?: boolean; // Whether to color the same as the owner for other people
}

declare interface RenderRay extends RenderParamsBase, ProjectileColorParams {
	type: "ray";
	intermediatePoints?: boolean; // A ray might be so fast that we need to render the subtick that it made contact, otherwise it doesn't look like it touched the other object at all

	ticks: number; // How long is the trail?
	glow?: number; // How much alpha to apply to the bloom
	bloom?: number; // How much radius to give the bloom
	shine?: number; // Lighten the trail initially
	fade?: string; // Fade towards this color
	vanish?: number; // Fade away the trail until it is transparent - 1 means fade it all away, 0 means do nothing
	noPartialRadius?: boolean;
	radiusMultiplier?: number;
}

declare interface RenderProjectile extends RenderParamsBase, ProjectileColorParams {
	type: "projectile";

	ticks: number; // How long is the trail?
	fade?: string;
	vanish?: number;
	smoke?: RenderSmoke;
	glow?: number;
	bloom?: number;
	shine?: number;
	noPartialRadius?: boolean;
	radiusMultiplier?: number;

	intermediateInterpolations?: number; // Render at this many intermediate points as well - fill in the gaps of very fast projectiles
}

declare interface RenderPolygon extends RenderParamsBase, ProjectileColorParams {
	type: "polygon";

	numPoints: number;
	ticks: number;
	revolutionInterval: number;
	fade?: string;
	vanish?: number;
	smoke?: RenderSmoke;
	glow?: number;
	bloom?: number;
	shine?: number;
	noPartialRadius?: boolean;
	radiusMultiplier?: number;
}

declare interface RenderSwirl extends RenderParamsBase {
	type: "swirl";
	radius: number;
	color: string;
	selfColor?: boolean;
	ticks: number; // How long is the trail?

	loopTicks: number; // How long for the swirl to do one full rotation?

	numParticles: number;
	particleRadius: number;

	shine?: number;
	smoke?: RenderSmoke;
	fade?: string;
	vanish?: number;
	glow?: number;
	bloom?: number;
}

declare interface RenderLink extends RenderParamsBase {
	type: "link";
	color: string;
	width: number;
	toWidth?: number;
	shine?: number;
	glow?: number;
	bloom?: number;
	strike?: RenderStrikeParams;
}

declare interface RenderReticule extends RenderParamsBase {
	type: "reticule";
	color: string;
	remainingTicks?: number; // Only display when this many ticks remaining
	shrinkTicks?: number;
	grow?: boolean;
	shine?: number;
	fade?: boolean;
	startingTicks?: number; // Only display for this many ticks since creation of the projectile
	repeat?: boolean; // Whether to repeatedly show the reticule shrinking
	minRadius: number;
	radius: number;
	usePartialDamageMultiplier?: boolean;
	glow?: number;
	bloom?: number;
}

declare interface RenderStrike extends RenderParamsBase, ProjectileColorParams, RenderStrikeParams {
	type: "strike";
	ticks: number;

	detonate?: number; // Render an explosion of this radius on hit
	numParticles?: number;
	particleShine?: number;
	particleGlow?: number;
	particleBloom?: number;
	particleVanish?: number;
	speedMultiplier?: number;
}

declare interface RenderStrikeParams {
	ticks?: number;
	flash?: boolean;
	growth?: number;
	bloom?: number;
}

declare interface RenderBloom extends RenderParamsBase, ProjectileColorParams {
	type: "bloom";
	shine?: number;
	glow?: number;
	radius?: number;
}

declare type RenderSmoke = number | RenderSmokeConfig;

declare interface RenderSmokeConfig {
	axisMultiplier?: number; // Follow direction of movement with this multiplier
	isotropicSpeed?: number; // Smoke in all directions at this speed
}

declare type BuffTemplate =
	DebuffTemplate
	| MovementBuffTemplate
	| GlideTemplate
	| LavaImmunityBuffTemplate
	| VanishTemplate
	| LifestealTemplate
	| SetCooldownTemplate
	| BurnTemplate
	| ArmorTemplate
	| MassTemplate
	| BumpTemplate
	| DelinkTemplate

declare interface BuffTemplateBase {
	type: string;

	stack?: string; // If there is another buff with the same stack name as this, replace it, don't add another buff
	maxStacks?: number; // Cannot have more than this many stacks. Defaults to 1.

	owner?: boolean; // If this is a projectile that hit, apply the buff to the owner, not to the target
	cleansable?: boolean; // Whether this buff can be cleansed, defaults to true

	collideWith?: number; // Only apply the buff if projectile hit this object
	against?: number; // Which alliances to apply this buff to
	maxTicks?: number; // Maximum duration of this buff

	channelling?: boolean; // Cancel this buff if the hero stops casting the spell
	linkOwner?: boolean; // Cancel this buff if no longer the owner of a link
	linkVictim?: boolean; // Cancel this buff if no longer the victim of a link
	cancelOnHit?: boolean; // Cancel this buff if the hero gets hit
	cancelOnBump?: boolean; // Cancel this buff if the hero bumps another
	passive?: boolean; // Cancel this buff if the hero stops choosing this spell
	resetOnGameStart?: boolean; // Cancel this buff when the game starts

	renderStart?: RenderBuff;
	render?: RenderBuff;
	renderFinish?: RenderBuff;
	sound?: string;
}

declare interface RenderBuff {
	numParticles?: number;
	invisible?: boolean; // Only show this to players who can see the hero
	color: string;
	selfColor?: boolean; // View own buffs in the self color
	alpha?: number; // Semi-transparent
	shine?: number; // Brighter initially
	glow?: number; // How much alpha to apply to the bloom
	bloom?: number; // Bloom radius
	fade?: string; // Decay to this color
	smoke?: RenderSmokeConfig; // Move smoke trail
	vanish?: number; // Decay to transparent
	heroColor?: boolean;
	decay?: boolean;
	emissionRadiusFactor?: number; // 1 means smoke comes from the edges of the hero, 0 means it comes from the center
	particleRadius: number;
	ticks: number;
}

declare interface DebuffTemplate extends BuffTemplateBase {
	type: "debuff";
}

declare interface MovementBuffTemplate extends BuffTemplateBase {
	type: "movement";
	movementProportion: number; // 0 will make the hero unable to move, 2 will make hero movement twice as fast
}

declare interface GlideTemplate extends BuffTemplateBase {
	type: "glide";
	linearDampingMultiplier: number; // 0 will make the hero glide
}

declare interface LavaImmunityBuffTemplate extends BuffTemplateBase {
	type: "lavaImmunity";
	damageProportion: number; // 0 will make the hero immune to void damage
}

declare interface VanishTemplate extends BuffTemplateBase {
	type: "vanish";
	noTargetingIndicator?: boolean;
	noBuffs?: boolean;
}

declare interface LifestealTemplate extends BuffTemplateBase { // Does more than lifesteal now...
	type: "lifeSteal";
	damageMultiplier?: number;
	lifeSteal?: number;
	minHealth?: number; // Don't leave the enemy with less health than this. For example, don't kill an enemy.
	decay?: boolean; // The damage multiplier linearly decays over time.

	source?: string; // Only affect damage packets with the same source
}

declare interface SetCooldownTemplate extends BuffTemplateBase {
	type: "cooldown";
	spellId?: string;
	minCooldown?: number;
	maxCooldown?: number;
	color?: string;
}

declare interface BurnTemplate extends BuffTemplateBase {
	type: "burn";
	hitInterval: number;
	packet: DamagePacketTemplate;
}

declare interface ArmorTemplate extends BuffTemplateBase {
	type: "armor";
	proportion: number; // Positive increases damage received, negative negates damage received

	source?: string; // Only affect damage packets with the same source
}

declare interface MassTemplate extends BuffTemplateBase {
	type: "mass";
	radius: number; // Increase the radius of the hero to this value
	appendCollideWith?: number; // Expand what the hero can collide with while this buff is active - e.g. collide with shields
	restrictCollideWith?: number; // Restrict what the hero can collide with while this buff is active
	sense?: number; // Don't physically collide with these objects, but perform all other collision effects
	density?: number; // Increase the density of the hero by amount
}

declare interface BumpTemplate extends BuffTemplateBase {
	type: "bump";
	impulse: number;
	hitInterval: number;
}

declare interface DelinkTemplate extends BuffTemplateBase {
	type: "delink";
}

declare interface BuffSpell extends SpellBase {
    action: "buff";

	buffs: BuffTemplate[];
	maxChannellingTicks?: number; // Keep channelling until this many ticks has been reached

	projectileInterval?: number;
	projectile?: ProjectileTemplate;
}

declare interface ScourgeSpell extends SpellBase {
    action: "scourge";

	selfDamage: number;
	minSelfHealth: number;

	detonate: DetonateParametersTemplate;
	knockbackScaling?: boolean; // Increase knockback as acolyte gets more powerful

    trailTicks: number;
}

declare interface ShieldSpell extends SpellBase {
	maxTicks: number;
	takesOwnership: boolean;
	damageMultiplier: number;
	blocksTeleporters: boolean;
	glow?: number;
	bloom?: number;
}

declare interface ReflectSpell extends ShieldSpell {
    action: "shield";
	radius: number;
	strike?: RenderStrikeParams;
}

declare interface WallSpell extends ShieldSpell {
	action: "wall";

	maxRange: number;

	length: number;
	width: number;

	growthTicks: number;
	maxTicks: number;

	conveyable?: boolean; // The wall is affected by conveyor belts
	bumpable?: boolean; // The wall is affected by bumpers
	swappable?: boolean; // Swap affects the wall
	density?: number; // If set, the wall is moveable
	ccd?: boolean; // Performance improvement: Whether to apply continuous collision detection to this wall. Small and fast projectiles will tunnel through other objects unless CCD is on. Defaults to true.
	linearDamping?: number; // Higher means receives less knockback
	angularDamping?: number; // Higher means less rotation on knockback

	categories?: number; // Use this to make a wall an impassable obstacle
	collideWith?: number;
	selfPassthrough?: boolean; // Whether to always allow the owner to pass through the wall

	strike?: RenderStrikeParams;
}

declare interface SaberSpell extends ShieldSpell {
	action: "saber";

	shiftMultiplier: number; // Move object by this proportion of the swing (ensures it doesn't get caught in the swing next tick and ends up sticking to the saber)
	speedMultiplier: number; // Accelerate object to the speed of the swing multiplied by this factor
	maxSpeed: number; // The maximum speed the saber can accelerate an object to
	maxTurnRatePerTickInRevs: number; // THe maximum speed the saber can be swung

	angleOffsetsInRevs: number[];
	length: number;
	width: number;

	channelling?: boolean;
	maxTicks: number;

	categories: number;
	collidesWith: number;

	damageTemplate?: DamagePacketTemplate; // Damage to apply to anyone we hit
	hitInterval?: number; // If saber hits multiple times, only apply damage/buffs at this interval
	hitBuffs?: BuffTemplate[]; // Buffs to apply to whoever we hit

	shine?: number;
	bloom?: number;
	glow?: number;
	strike?: RenderStrikeParams;
	trailTicks: number;
}

declare interface TeleportSpell extends SpellBase {
	action: "teleport";
	range: number;
}

declare interface ThrustSpell extends SpellBase {
    action: "thrust";

	range: number;
	speed: number;
	followCursor?: boolean;

	damageTemplate: DamagePacketTemplate;

	// Create a projectile at this interval
	projectileInterval?: number;
	projectile?: ProjectileTemplate;
}

declare interface RenderThrust {
	ticks: number;
}

declare interface KeyBindingOptions {
    [key: string]: string[][];
}

declare interface KeyBindings {
    [key: string]: string;
}

declare interface LinkParameters {
	linkWith: number; // Categories of object to link to

	selfFactor?: number; // How much should the link pull the hero towards the target
	targetFactor?: number; // How much should the link pull the target towards the hero

	impulsePerTick: number;
	sidewaysImpulsePerTick?: number; // How much should the link pull the target sideways
	massInvariant?: boolean; // Same force regardless of the mass that is being pulled

	linkTicks: number;
	minDistance: number;
	maxDistance: number;

	redirectDamage?: RedirectDamageParameters;
	channelling?: boolean;

	render?: RenderLink;
}

declare interface RedirectDamageParameters {
	selfProportion: number; // Proportion of damage to absorb when linked (0 means no damage)
	redirectProportion: number; // Proportion of damage to redirect when linked (1 means all damage)
	redirectAfterTicks: number; // Don't start redirecting damage until this many ticks have passed
}

declare interface DamagePacketTemplate {
	damage: number;
	damageScaling?: boolean;
	lifeSteal?: number;
	isLava?: boolean;
	noHit?: boolean; // Don't count this as a hit - no hero flashing and no halo stripping
	noKnockback?: boolean; // Don't count as knockback - will not attribute future void damage to this hero
	minHealth?: number; // Never reduce the enemy below this level of health

	source?: string; // Damage/Lifesteal Buffs which have the same stack will be applied to this
}

declare interface Vec2 {
	x: number;
	y: number;
}

interface IconLookup {
	[key: string]: Icon;
}

interface Icon {
	path: string; // The SVG path of the icon
	credit?: string; // A link to where the icon is from - not used by the game, just to give credit to the author
}

type WaveType = "sine" | "square" | "sawtooth" | "triangle" | "brown-noise";

interface Sounds {
	[key: string]: Sound;
}

interface Sound {
	start?: SoundBite[];
	sustain?: SoundBite[];

	repeatIntervalSeconds?: number;
	cutoffSeconds?: number; // If this sound is stopped early, ramp volume to zero over this many seconds
	cutoffEarly?: boolean; // Whether to cutoff the sound early if the action is cancelled (e.g. if the spell stops charging). Defaults to true.

	intensityUpdateFactor?: number; // The rate at which the volume is adjusted to match intensity
	intensityDelay?: number; // The speed at which the volume changes to the new intensity

}

interface SoundBite {
	volume?: number;

	startTime?: number;
	stopTime: number;

	startFreq?: number;
    stopFreq?: number;

    tremoloFreq?: number;
	tremoloStrength?: number;

	modStartFreq?: number;
	modStopFreq?: number;
	modStartStrength?: number;
	modStopStrength?: number;

	highPass?: number;
	lowPass?: number;

	attack?: number;
	decay?: number;

	wave: WaveType;
	ratios?: number[];
}

interface VisualSettings {
	// Default projectile visuals
	DefaultFlashTicks: number;
	DefaultGlowRadius: number;

	// Map visuals
	Background: string;
	DefaultWorldColor: string;
	WorldStrokeProportion: number; // The width of the edge of the map
	WorldStrokeBrightness: number;
	WorldHexHeight: number; // Height in number of pixels for hexagons
	WorldHexWidth: number; // Height in number of pixels for hexagons
	WorldHexMask: number;

	WorldAnimateWinTicks: number;
	WorldWinGrowth: number;

	// How much to shake the map when projectiles hit
	ShakeDistance: number;
	ShakeTicks: number;

	// How much to flash the map when projectiles hit
	HighlightFactor: number;
	HighlightTicks: number;

	// Controls the rate at which acolytes arrive/depart
	EaseTicks: number;
	EaseInDistance: number;
	EasePower: number;
	ExitTicks: number;

	// Spell casting visuals
	ChargingRadius: number;
	CastingFlashTicks: number;

	// Visuals when acolyte takes damage
	Damage: RenderStrikeParams;

	// Controls the name floating above the acolyte
	NameMargin: number;
	NameFontPixels: number;
	NameHeightPixels: number;
	NameWidthPixels: number;

	// Health bar floating above the acolyte
	HealthBarHeroRadiusFraction: number;
	HealthBarHeight: number;
	HealthBarMargin: number;

	// The buttons at the bottom of the screen
	ButtonBarMaxHeightProportion: number;
	ButtonBarSpacing: number;
	ButtonBarMargin: number;
	ButtonBarSize: number;
	ButtonBarGap: number;

	// Camera
	CameraPanRate: number;
	CameraZoomRate: number;

	CameraMaxZoom: number;
	CameraMinPixelsForZoom: number;
	CameraSmoothRate: number;

	CameraCenterTolerance: number;
	CameraZoomTolerance: number;

	// Acolyte colors
	MyHeroColor: string;
	AllyColor: string;
	BotColor: string;

	OnlineColor: string; // Color in the scoreboard if player not in your current game

	Colors: string[]; // List of all acolyte colors
	TeamColors: string[]; // List of all acolyte team colors

}