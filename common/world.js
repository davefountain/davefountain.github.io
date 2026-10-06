class Body {
	constructor(pos, vel, mass, r, color = null, id = null) {
		this.pos = pos.copy();
		this.vel = vel.copy();
		this.mass = mass;
		this.r = r;
		this.color = color;
		this.id = id;
		this.angle = 0;
		this.omega = 0;
		this.inertia = Infinity;
		this.canCollide = true; // If false for BOTH bodies in a pair, they pass through each other
		this.isStatic = false; // If true, body is locked in place and acts as infinite mass in collisions
	}
	momentum() {
		return p5.Vector.mult(this.vel, this.mass);
	}
	linearEnergy() {
		return 0.5 * this.mass * this.vel.magSq();
	}
	rotationalEnergy() {
		return 0.5 * this.inertia * sq(this.omega);
	}
	potentialEnergy(worldGravity, panelHeight) {
    // Height 'h' is measured from the bottom of the screen upward
    let heightFromFloor = panelHeight - this.pos.y;
    // PE = m * g * h
    return this.mass * worldGravity * heightFromFloor;
	}
	spinAngularMomentum() {
		return this.inertia * this.omega;
	}
	orbitalAngularMomentum(origin) {
		let r = p5.Vector.sub(this.pos, origin);
		let p = this.momentum();
		return r.x * p.y - r.y * p.x;
	}
	angularMomentum(origin) {
		return this.orbitalAngularMomentum(origin) + this.spinAngularMomentum();
	}
	energy() {
		return this.linearEnergy() + this.rotationalEnergy();
	}
	// Updated to accept w, h of the simulation panel
	isVisible(w, h) {
		return (
			this.pos.x + this.r >= 0 &&
			this.pos.x - this.r <= w &&
			this.pos.y + this.r >= 0 &&
			this.pos.y - this.r <= h
		);
	}
	continuousWrap(w, h) {
		if (this.isVisible(w, h)) return;
		let step = this.vel.copy();
		let maxSteps = 100000;
		let count = 0;
		while (!this.isVisible(w, h) && count < maxSteps) {
			this.pos.sub(step);
			count++;
		}
		while (this.isVisible(w, h) && count < maxSteps) {
			this.pos.sub(step);
			count++;
		}
		this.pos.add(step);
		if (!this.isVisible(w, h)) {
			console.log("WRAP FAILED", this.pos, this.vel);
			pause = true; // Safe pause instead of noLoop()
		}
	}
	teleportWrap(w, h) {
		// X-Axis Wrapping
		if (this.pos.x - this.r > w) {
			this.pos.x = -this.r; // Exited right, move to just outside left
		} else if (this.pos.x + this.r < 0) {
			this.pos.x = w + this.r; // Exited left, move to just outside right
		}
		// Y-Axis Wrapping
		if (this.pos.y - this.r > h) {
			this.pos.y = -this.r; // Exited bottom, move to just outside top
		} else if (this.pos.y + this.r < 0) {
			this.pos.y = h + this.r; // Exited top, move to just outside bottom
		}
	}
	bounceWall(w, h) {
		// X-Axis Bounce
		if (this.pos.x + this.r > w) {
			let penetration = (this.pos.x + this.r) - w;
			this.pos.x = w - this.r - penetration; // Reflect position
			this.vel.x *= -1;
		} else if (this.pos.x - this.r < 0) {
			let penetration = 0 - (this.pos.x - this.r);
			this.pos.x = this.r + penetration; // Reflect position
			this.vel.x *= -1;
		}
		// Y-Axis Bounce
		if (this.pos.y + this.r > h) {
			let penetration = (this.pos.y + this.r) - h;
			this.pos.y = h - this.r - penetration; // Reflect position
			this.vel.y *= -1;
		} else if (this.pos.y - this.r < 0) {
			let penetration = 0 - (this.pos.y - this.r);
			this.pos.y = this.r + penetration; // Reflect position
			this.vel.y *= -1;
		}
	}
	update(w, h, mode) {
		this.pos.add(this.vel);
		this.angle += this.omega;
		switch (mode) {
			case 'repeat':
				this.continuousWrap(w, h);
				break;
			case 'wrap':
				this.teleportWrap(w, h);
				break;
			case 'bounce':
				this.bounceWall(w, h);
				break;
				// 'forget' is handled by the manager, so it needs no case here!
		}
	}
}
class Ball extends Body {
	constructor(pos, vel, r, color = null, id = null) {
		let mass = PI * r * r;
		super(pos, vel, mass, r, color, id);
		this.inertia = 0.5 * mass * r * r;
	}
	show() {
		fill(this.color);
		circle(this.pos.x, this.pos.y, this.r * 2);
	}
}
class Box extends Body {
	constructor(pos, vel, w, h, angle = 0, color = null, id = null) {
		let mass = w * h;
		let r = sqrt(sq(w / 2) + sq(h / 2));
		super(pos, vel, mass, r, color, id);
		this.w = w;
		this.h = h;
		this.angle = angle;
		this.inertia = (1 / 12) * mass * (w * w + h * h);
	}
	show() {
		push();
		translate(this.pos.x, this.pos.y);
		rotate(this.angle);
		rectMode(CENTER);
		fill(this.color);
		rect(0, 0, this.w, this.h);
		pop();
	}
}
class World {
	constructor() {
		this.bodies = [];
		this.gravity = 0;
		this.collisions = 0;
		this.boundaryMode = "repeat";
		this.busyPercent = 0;
		this.isRunning = false;
	}
	setBoundaryMode(mode) {
		this.boundaryMode = mode;
	}
	add(body) {
		this.bodies.push(body);
	}
	clear() {
		this.bodies.length = 0;
		this.collisions = 0;
	}
	setGravity(g) {
		this.gravity = g;
	}

	getTotalEnergy(panelHeight) {
    let totalE = 0;
    for (let body of this.bodies) {
        totalE += body.energy(); // Kinetic
        totalE += body.potentialEnergy(this.gravity, panelHeight); // Potential
    }
    return totalE;
	}
	getTotalMomentum() {
		// Start with a zero vector
		let totalP = createVector(0, 0);
		for (let body of this.bodies) {
			// Because body.momentum() returns a new p5.Vector, we can just add it
			totalP.add(body.momentum());
		}
		return totalP;
	}
	getTotalAngularMomentum(origin) {
		let totalL = 0;
		for (let body of this.bodies) {
			totalL += body.angularMomentum(origin);
		}
		return totalL;
	}
	getBodiesCount() {
		return this.bodies.length;
	}
	getBusyPercent() {
		return this.busyPercent;
	}
	step(w, h) {
		if (!this.isRunning) return;
		let startTime = performance.now();

		// 1. Apply gravity and update positions
		for (let body of this.bodies) {
			if (body.isStatic) continue; // Locked in place: skip gravity and movement

			body.vel.y += this.gravity;

			body.update(w, h, this.boundaryMode);
		}
		// 2. Handle the "forget" boundary mode
		if (this.boundaryMode === "forget") {
			// Keep the body ONLY if its own isVisible method returns true
			this.bodies = this.bodies.filter(body => body.isVisible(w, h));
		}

		// 3. Process all collisions
		let substeps = 4;
		for (let step = 0; step < substeps; step++) {
			this._handleCollisions(w, h);
		}

		// Stop the clock and calculate
		let endTime = performance.now();
		let frameTime = endTime - startTime;
		let frameBudget = 1000 / 60; // ~16.67ms
		let currentBusy = (frameTime / frameBudget) * 100;
		// Smooth the result
		this.busyPercent = lerp(this.busyPercent, currentBusy, 0.1);
	}
	render() {
		for (let body of this.bodies) {
			if (typeof body.show === 'function') body.show();
		}
	}
	// --- ENCAPSULATED PHYSICS MATH ---
	_handleCollisions(w, h) {
		let len = this.bodies.length;
		if (len < 2) return;
		// 1. BROAD PHASE: Sort ALL bodies by their leftmost edge along the X-axis.
		// Because boxes also calculate an 'r' value representing their outer corner distance,
		// 'pos.x - r' acts as a perfect, safe bounding boundary for both balls and boxes
		this.bodies.sort((a, b) => (a.pos.x - a.r) - (b.pos.x - b.r));
		// 2. SWEEP AND PRUNE LOOP
		for (let i = 0; i < len; i++) {
			let bodyI = this.bodies[i];
			let maxX_I = bodyI.pos.x + bodyI.r; // Rightmost edge of body I
			for (let j = i + 1; j < len; j++) {
				let bodyJ = this.bodies[j];
				// --- X-AXIS PRUNE (Early Out) ---
				// If body J's left edge is completely past body I's right edge,
				// then body J (and everyone after it) is too far right to collide.
				if ((bodyJ.pos.x - bodyJ.r) > maxX_I) {
					break;
				}
				// --- Y-AXIS FILTER (Cheap Boundary Check) ---
				// If they overlap on X but are completely separated vertically, skip them.
				if (bodyJ.pos.y + bodyJ.r < bodyI.pos.y - bodyI.r ||
					bodyJ.pos.y - bodyJ.r > bodyI.pos.y + bodyI.r) {
					continue;
				}
				// --- COLLISION FLAG FILTER ---
				// Only collide if at least one of the pair opts in; if both are
				// non-colliding, they pass through each other.
				if (!bodyI.canCollide && !bodyJ.canCollide) {
					continue;
				}
				// --- NARROW PHASE: Type-Specific Routing ---
				// If the code gets here, their 2D bounding boxes overlap! 
				// Now we check what types we are dealing with to fire the correct math.
				let isBallI = bodyI instanceof Ball;
				let isBallJ = bodyJ instanceof Ball;
				// Scenario A: Both are Balls -> Run Ball-to-Ball math
				if (isBallI && isBallJ) {
					if (this._areColliding(bodyI, bodyJ)) {
						this._handleCollision(bodyI, bodyJ);
					}
				}
				// Scenario B: One is a Ball, one is a Box -> Run Ball-to-Box math
				else if (isBallI !== isBallJ) {
					let ball = isBallI ? bodyI : bodyJ;
					let box = isBallI ? bodyJ : bodyI;
					let collision = this._ballBoxCollision(ball, box);
					if (collision.hit) {
						this._resolveCollision(ball, box, collision.point, w, h);
					}
				}
			}
		}
	}
	_areColliding(ballA, ballB) {
		return (ballA.pos.dist(ballB.pos) < ballA.r + ballB.r);
	}
	_handleCollision(a, b) {
		let n = p5.Vector.sub(a.pos, b.pos);
		n.normalize();
		let relVel = p5.Vector.sub(a.vel, b.vel);
		let vn = relVel.dot(n);
		if (vn > 0) return; // They are moving apart
		let e = 1.0; // Restitution (bounciness)
		// Static bodies contribute zero inverse mass, i.e. infinite mass,
		// so all of the impulse is absorbed by the other body.
		let invMassA = a.isStatic ? 0 : 1 / a.mass;
		let invMassB = b.isStatic ? 0 : 1 / b.mass;
		if (invMassA + invMassB === 0) return; // Both static: nothing to resolve
		this.collisions++;
		let j = (-(1 + e) * vn) / (invMassA + invMassB);
		let impulse = p5.Vector.mult(n, j);
		if (!a.isStatic) a.vel.add(p5.Vector.div(impulse, a.mass));
		if (!b.isStatic) b.vel.sub(p5.Vector.div(impulse, b.mass));
	}

	_resolveCollision(ball, box, contactPoint, w, h) {
		let n = this._collisionNormal(ball, contactPoint);
		let vrel = this._relativeVelocity(ball, box, contactPoint);
		let vn = vrel.dot(n);
		if (vn >= 0) return;
		let r = p5.Vector.sub(contactPoint, box.pos);
		let rCrossN = r.x * n.y - r.y * n.x;
		let e = 1.0;
		// Static bodies contribute zero inverse mass/inertia (i.e. infinite),
		// so a static ball or box won't move or spin from the impact.
		let invMassBall = ball.isStatic ? 0 : 1 / ball.mass;
		let invMassBox = box.isStatic ? 0 : 1 / box.mass;
		let invInertiaBox = box.isStatic ? 0 : sq(rCrossN) / box.inertia;
		let denom = invMassBall + invMassBox + invInertiaBox;
		if (denom === 0) return; // Both static: nothing to resolve
		this.collisions++;
		let j = (-(1 + e) * vn) / denom;
		let impulse = p5.Vector.mult(n, j);
		if (!ball.isStatic) ball.vel.add(p5.Vector.div(impulse, ball.mass));
		if (!box.isStatic) {
			box.vel.sub(p5.Vector.div(impulse, box.mass));
			let torque = r.x * impulse.y - r.y * impulse.x;
			box.omega -= torque / box.inertia;
		}
		// Continuous wrap call after collision (repeat mode only)
		if (this.boundaryMode === "repeat") {
			if (typeof box.continuousWrap === 'function') box.continuousWrap(w, h);
			if (typeof ball.continuousWrap === 'function') ball.continuousWrap(w, h);
		}
	}
	_closestPointOnBox(ball, box) {
		let local = p5.Vector.sub(ball.pos, box.pos);
		local.rotate(-box.angle);
		let clamped = createVector(
			constrain(local.x, -box.w / 2, box.w / 2),
			constrain(local.y, -box.h / 2, box.h / 2)
		);
		clamped.rotate(box.angle);
		clamped.add(box.pos);
		return clamped;
	}
	_ballBoxCollision(ball, box) {
		let closest = this._closestPointOnBox(ball, box);
		let d = p5.Vector.dist(ball.pos, closest);
		return {
			hit: d < ball.r,
			point: closest
		};
	}
	_collisionNormal(ball, contactPoint) {
		let n = p5.Vector.sub(ball.pos, contactPoint);
		n.normalize();
		return n;
	}
	_relativeVelocity(ball, box, contactPoint) {
		let r = p5.Vector.sub(contactPoint, box.pos);
		let v_rot = createVector(-r.y, r.x).mult(box.omega);
		let v_rect = p5.Vector.add(box.vel, v_rot);
		return p5.Vector.sub(ball.vel, v_rect);
	}
}