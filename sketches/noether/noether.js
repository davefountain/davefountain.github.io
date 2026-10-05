// Conservation demo. Keys: 1-4 boundary mode (use "repeat" for conservation), R reset.
const MODES = ["bounce", "wrap", "repeat", "forget"];
const SIM_W = 900;
const SIM_H = 400;
const PANEL_W = SIM_W / 3;
const PANEL_H = 200;
let world;
let bodies; // fixed order, so the arrow chain doesn't reshuffle (world.bodies gets sorted)
let scale; // pixels per unit of momentum
let origin; // fixed start of the arrow chain, panel coordinates
let centre; // point angular momentum is measured about
let angScale; // pixels per unit of angular momentum
let angX; // fixed x of the zero line in the angular momentum panel, panel coordinates

function setup() {
	createCanvas(SIM_W, PANEL_H + SIM_H);
	world = new World();
	world.isRunning = true;
	world.setBoundaryMode("repeat");
	centre = createVector(SIM_W / 2, SIM_H / 2);
	reset();
}

function randomVel() {
	// small common drift so the total momentum isn't near zero
	return p5.Vector.random2D().mult(random(1, 3)).add(0.5, 0.3);
}

function reset() {
	world.clear();
	bodies = [];
	for (let i = 0; i < 8; i++) {
		let pos = createVector(random(50, SIM_W - 50), random(50, SIM_H - 50));
		let col = color(random(100, 255), random(100, 255), random(100, 255));
		bodies.push(new Ball(pos, randomVel(), random(10, 25), col));
	}
	let box = new Box(createVector(SIM_W / 2, SIM_H / 2), randomVel(), 80, 40, 0, color(255, 180, 60));
	bodies.push(box);
	for (let b of bodies) world.add(b);

	// Fixed scale: the total arrow is 60% of the panel height and centred in the panel.
	// Individual arrows may spill outside; the floor stops a near-zero total blowing up the scale.
	let sum = 0;
	for (let b of bodies) sum += b.momentum().mag();
	let total = world.getTotalMomentum();
	scale = (PANEL_H * 0.6) / max(total.mag(), 0.2 * sum);
	origin = createVector(PANEL_W / 2, PANEL_H / 2).sub(total.mult(scale / 2));

	// Same idea for angular momentum: total arrow is at most 70px, centred in its panel.
	let sumL = 0;
	for (let r of angularRows()) sumL += abs(r.L);
	let totalL = world.getTotalAngularMomentum(centre);
	angScale = 70 / max(abs(totalL), 0.2 * sumL);
	angX = PANEL_W * 0.63 - (totalL * angScale) / 2;
}

function keyPressed() {
	if (key >= "1" && key <= "4") world.setBoundaryMode(MODES[key - 1]);
	if (key === "r" || key === "R") reset();
}

function drawArrow(a, b, col, weight) {
	stroke(col);
	strokeWeight(weight);
	fill(col);
	line(a.x, a.y, b.x, b.y);
	let d = p5.Vector.sub(b, a);
	if (d.mag() < 1) return;
	push();
	translate(b.x, b.y);
	rotate(d.heading());
	noStroke();
	triangle(0, 0, -6, 3, -6, -3);
	pop();
}

function drawPanelFrame(i, title) {
	noStroke();
	fill(30);
	rect(i * PANEL_W, 0, PANEL_W, PANEL_H);
	fill(255);
	text(title, i * PANEL_W + 10, 20);
}

function drawMomentumArrows() {
	push();
	let tail = origin.copy();
	for (let b of bodies) {
		let tip = p5.Vector.add(tail, b.momentum().mult(scale));
		drawArrow(tail, tip, b.color, 1);
		tail = tip;
	}
	drawArrow(origin, tail, 255, 2);
	pop();
}

function drawEnergyTable() {
	push();
	let colLin = PANEL_W + 140;
	let colRot = PANEL_W + 215;
	let colTot = PANEL_W + 290;
	let y = 36;
	textSize(11);
	noStroke();
	fill(160);
	textAlign(RIGHT);
	text("linear", colLin, y);
	text("rotational", colRot, y);
	text("total", colTot, y);

	let sumLin = 0;
	let sumRot = 0;
	for (let i = 0; i < bodies.length; i++) {
		let b = bodies[i];
		let lin = b.linearEnergy();
		let rot = b.rotationalEnergy();
		sumLin += lin;
		sumRot += rot;
		y += 14;
		fill(b.color);
		textAlign(LEFT);
		text(b instanceof Box ? "Box" : "Ball " + (i + 1), PANEL_W + 10, y);
		textAlign(RIGHT);
		text(lin.toFixed(1), colLin, y);
		text(rot.toFixed(1), colRot, y);
		text((lin + rot).toFixed(1), colTot, y);
	}
	y += 18;
	fill(255);
	textAlign(LEFT);
	text("Total", PANEL_W + 10, y);
	textAlign(RIGHT);
	text(sumLin.toFixed(1), colLin, y);
	text(sumRot.toFixed(1), colRot, y);
	text((sumLin + sumRot).toFixed(1), colTot, y);
	pop();
}

// One row per body; the box gets two (orbital and spin). Positive = clockwise on screen.
function angularRows() {
	let rows = [];
	for (let i = 0; i < bodies.length; i++) {
		let b = bodies[i];
		if (b instanceof Box) {
			rows.push({ label: "Box orbital", col: b.color, L: b.orbitalAngularMomentum(centre) });
			rows.push({ label: "Box spin", col: b.color, L: b.spinAngularMomentum() });
		} else {
			rows.push({ label: "Ball " + (i + 1), col: b.color, L: b.angularMomentum(centre) });
		}
	}
	return rows;
}

function drawAngularPanel() {
	push();
	let left = 2 * PANEL_W;
	let x0 = left + angX;
	textSize(11);
	noStroke();
	fill(170);
	textAlign(RIGHT);
	text("+ = clockwise", left + PANEL_W - 10, 20);
	textAlign(LEFT);
	stroke(80);
	strokeWeight(1);
	line(x0, 28, x0, 188);

	let x = x0;
	let y = 36;
	for (let r of angularRows()) {
		let tip = x + r.L * angScale;
		noStroke();
		fill(r.col);
		text(r.label, left + 10, y);
		drawArrow(createVector(x, y - 4), createVector(tip, y - 4), r.col, 1);
		x = tip;
		y += 14;
	}
	y += 4;
	noStroke();
	fill(255);
	text("Total", left + 10, y);
	drawArrow(createVector(x0, y - 4), createVector(x, y - 4), 255, 2);
	pop();
}

function draw() {
	background(20);
	world.step(SIM_W, SIM_H);
	push();
	translate(0, PANEL_H);
	world.render();
	fill(255);
	noStroke();
	text("mode: " + world.boundaryMode + "  (1-4, R resets)", 10, 20);
	pop();
	// panels are drawn after the simulation, so they cover bodies drifting over the top edge
	push();
	drawPanelFrame(0, "total momentum");
	drawPanelFrame(1, "energy");
	drawPanelFrame(2, "angular momentum");
	pop();
	drawEnergyTable();
	drawAngularPanel();
	drawMomentumArrows(); // last, so spilled arrows draw over everything
}