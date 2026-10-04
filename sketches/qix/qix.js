function glow(color, x, y, image, uniforms) {
	let blur = new DFX.ColorVec(0, 0, 0, 0);
	let total = 0;

	for (let ring = 0; ring < 4; ring++) {
		let dist = uniforms.radius * (float(ring) + 1) / 4;
		let weight = 1 / (float(ring) + 1);

		for (let i = 0; i < 8; i++) {
			let angle = float(i) * 0.785398;   // 2π / 8
			let sx = x + cos(angle) * dist;
			let sy = y + sin(angle) * dist;
			blur = blur.add(image.sample(sx, sy).scale(weight));
			total += weight;
		}
	}

	blur = blur.scale(1 / total);
	return color.add(blur.scale(uniforms.strength));
}

let qix = new Array();
class qik {
	constructor() {
		this.p1 = createVector(random(0, width), random(0, height));
		this.p2 = createVector(random(0, width), random(0, height));
		this.p3 = createVector(random(0, width), random(0, height));
		this.v1 = p5.Vector.random2D().mult(5);
		this.v2 = p5.Vector.random2D().mult(5);
		this.v3 = p5.Vector.random2D().mult(5);
	}
	draw() {
		stroke(map(this.p1.x, 0, width, 0, 359), map(this.p2.x, 0, width, 0, 359), 70);
		this.p1.add(this.v1);
		this.p2.add(this.v2);
		this.p3.add(this.v3);
		if (this.p1.x < 0 || this.p1.x > width) this.v1.x = -this.v1.x;
		if (this.p2.x < 0 || this.p2.x > width) this.v2.x = -this.v2.x;
		if (this.p3.x < 0 || this.p3.x > width) this.v3.x = -this.v3.x;
		if (this.p1.y < 0 || this.p1.y > height) this.v1.y = -this.v1.y;
		if (this.p2.y < 0 || this.p2.y > height) this.v2.y = -this.v2.y;
		if (this.p3.y < 0 || this.p3.y > height) this.v3.y = -this.v3.y;
		beginShape();
		bezierVertex(this.p1.x, this.p1.y);
		bezierVertex(this.p1.x, this.p1.y);
		bezierVertex(this.p2.x, this.p2.y);
		bezierVertex(this.p3.x, this.p3.y);
		endShape();

		//line(this.p1.x, this.p1.y, this.p2.y, this.p2.x);
		//line(this.p1.y, this.p1.x, this.p2.x, this.p2.y);
		//line(this.p1.y, this.p1.x, this.p2.y, this.p2.x);
	}
	clone() {
		this.t = new qik();
		this.t.p1 = this.p1.copy();
		this.t.p2 = this.p2.copy();
		this.t.p3 = this.p3.copy();
		this.t.v1 = this.v1.copy();
		this.t.v2 = this.v2.copy();
		this.t.v3 = this.v3.copy();
		return this.t;
	}
}

let dfx;
let bar;
let uniforms = { radius: 12, strength: 1.9 };
let mode = 'GPU';
let timing = { qix: 0, grab: 0, run: 0, image: 0 };

function setup() {
	createCanvas(1280, 720);
	frame = createImage(width, height);
	pixelDensity(1);
	dfx = new DFX();
	colorMode(HSL, 359, 100, 100);
	bar = new StatusBar();
	bar.addToggleButton('GPU', 'CPU', function (flipped) { mode = flipped ? 'CPU' : 'GPU'; });
	bar.addFps();
	bar.addDrawTime();
	bar.addFreeTime();
	bar.addPrint(); strokeWeight(2);
	bar.addPlayPause();
	bar.addSlider('radius', 0, 30, uniforms, 'radius');
	bar.addSlider('strength', 0, 4, uniforms, 'strength');
	bar.addLabel(function () {
		return 'qix ' + timing.qix.toFixed(1) +
			' grab ' + timing.grab.toFixed(1) +
			' run ' + timing.run.toFixed(1) +
			' image ' + timing.image.toFixed(1);
	});
	noFill();
	background(0);
	q = new qik();
	qix.push(q);
	for (let i = 0; i < 49; i++) {
		qix.push(q.clone());
	}
}

function draw() {
	bar.begin();
	let t0 = performance.now();
	background(0);
	for (let i = 0; i < 50; i++) {
		if (frameCount > i * 4) {
			qix[i].draw();
		}
	}
	let t1 = performance.now();


	// Capture the canvas, run the filter, draw the result back over it
	let frame = dfx.grab();
	let t2 = performance.now();
	let result = dfx.run(frame, { shaderFunc: glow, uniforms: uniforms }, 'GPU');
	let t3 = performance.now();
	image(result, 0, 0, width, height);
	let t4 = performance.now();

	// Shorthand: run(shaderFunc, uniforms, mode) filters the whole canvas
	//dfx.run(glow, uniforms, mode);

	timing.qix = t1 - t0;
	timing.grab = t2 - t1;
	timing.run = t3 - t2;
	timing.image = t4 - t3;
	bar.update();
}