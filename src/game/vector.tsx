import pl from 'planck-js';

export const Tau = 2 * Math.PI;

// Vector utils
export function zero() {
	return pl.Vec2(0, 0);
}

export function isZero(vec: pl.Vec2) {
	return vec.x === 0 && vec.y === 0;
}

export function diff(to: pl.Vec2, from: pl.Vec2) {
	return pl.Vec2(to.x - from.x, to.y - from.y);
}

export function length(vec: pl.Vec2) {
	return Math.sqrt(vec.x * vec.x + vec.y * vec.y);
}

export function unit(vec: pl.Vec2) {
	let len = length(vec);
	return len == 0 ? vec : pl.Vec2(vec.x / len, vec.y / len);
}

export function multiply(vec: pl.Vec2, multiplier: number) {
	return pl.Vec2(vec.x * multiplier, vec.y * multiplier);
}

export function truncate(vec: pl.Vec2, maxLength: number) {
	let len = length(vec);
	if (len > maxLength) {
		return multiply(vec, maxLength / len);
	} else {
		return vec;
	}
}

export function towards(from: pl.Vec2, to: pl.Vec2, distance: number) {
	let d = diff(to, from);
	let step = truncate(d, distance);
	return plus(from, step);
}

// Keep length, but use new direction
export function redirect(oldDirection: pl.Vec2, newDirection: pl.Vec2) {
	return relengthen(newDirection, oldDirection.length());
}

// Keep direction, but use new length
export function relengthen(oldDirection: pl.Vec2, newLength: number) {
	let result = oldDirection.clone();
	result.normalize();
	return result.mul(newLength);
}

export function plus(a: pl.Vec2, b: pl.Vec2) {
	return pl.Vec2(a.x + b.x, a.y + b.y);
}

export function distance(a: pl.Vec2, b: pl.Vec2) {
	return pl.Vec2.distance(a, b);
}

export function clone(vec: pl.Vec2) {
	return pl.Vec2(vec.x, vec.y);
}

export function angle(vec: pl.Vec2) {
	return Math.atan2(vec.y, vec.x);
}

export function angleDiff(to: pl.Vec2, from: pl.Vec2) {
	return Math.atan2(to.y - from.y, to.x - from.x);
}

export function fromAngle(angle: number, radius: number = 1) {
	return pl.Vec2(radius * Math.cos(angle), radius * Math.sin(angle));
}

export function negate(vec: pl.Vec2) {
	return pl.Vec2(-vec.x, -vec.y);
}

export function rotateLeft(vec: pl.Vec2) {
	return pl.Vec2(vec.y, -vec.x);
}

export function rotateRight(vec: pl.Vec2) {
	return pl.Vec2(-vec.y, vec.x);
}

export function dot(a: pl.Vec2, b: pl.Vec2) {
	return a.x * b.x + a.y * b.y;
}

export function scaleAround(pos: pl.Vec2, center: pl.Vec2, multiplier: number): pl.Vec2 {
	if (multiplier === 1) {
		return pos;
	} else if (multiplier === 0) {
		return center;
	} else {
		const offset = diff(pos, center);
		return offset.mul(multiplier).add(center);
	}
}

export function angleDelta(currentAngle: number, targetAngle: number) {
	const Precision = 0.001;

	let delta = targetAngle - currentAngle;
	while (delta > Math.PI) {
		delta -= 2 * Math.PI;
	}
	while (delta < -Math.PI) {
		delta += 2 * Math.PI;
	}

	if (Math.abs(Math.PI - delta) < Precision) {
		// break ties consistently on all machines
		delta = Math.PI;
	}


	return delta;
}

export function turnTowards(currentAngle: number, targetAngle: number, turnRate: number) {
	let delta = angleDelta(currentAngle, targetAngle);
	const turnDelta = Math.min(Math.abs(delta), turnRate) * Math.sign(delta);
	const newAngle = currentAngle + turnDelta;
	return newAngle;
}

export function redirectTowards(vec: pl.Vec2, targetVec: pl.Vec2, turnRate: number) {
	const currentAngle = angle(vec);
	const targetAngle = angle(targetVec);
	const newAngle = turnTowards(currentAngle, targetAngle, turnRate);
	return redirect(vec, fromAngle(newAngle));
}

export function turnVectorBy(currentVector: pl.Vec2, deltaAngle: number) {
	const currentAngle = angle(currentVector);
	const newAngle = currentAngle + deltaAngle;

	return fromAngle(newAngle, length(currentVector));
}

export function mid(a: pl.Vec2, b: pl.Vec2): pl.Vec2 {
	return pl.Vec2((a.x + b.x) / 2, (a.y + b.y) / 2);
}

export function average(points: pl.Vec2[]) {
	let totalX = 0.0;
	let totalY = 0.0;
	let count = 0;
	points.forEach(point => {
		totalX += point.x;
		totalY += point.y;
		++count;
	});

	return count ? pl.Vec2(totalX / count, totalY / count) : zero();
}

export function insideLine(obj: pl.Vec2, objSize: number, lineStart: pl.Vec2, lineEnd: pl.Vec2, antiClockwise: boolean = true) {
	const outside = rotateLeft(diff(lineEnd, lineStart));
	if (!antiClockwise) {
		outside.neg();
	}
	outside.normalize();

	const distanceToLine = dot(diff(obj, lineStart), outside);
	return distanceToLine <= objSize;
}