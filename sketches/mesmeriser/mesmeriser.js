let a1 = 0;
let a2 = 180;
let bar;
let dfx;

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

function setup() {
	createCanvas(900, 600);
    bar = new StatusBar();
	dfx = new DFX();
	bar.addSlider('arms', 10, 1, 50);
	bar.addSlider('angle', 45, -180, 180);
	bar.addSlider('width', 1, 1, 10);
	bar.addSlider('linner', 100, 10, 200);
	bar.addSlider('louter', 100, 10, 200);
	bar.addSlider('glow', 12, 0, 30);
	bar.addFps();
	angleMode(DEGREES);
	ellipseMode(CORNER);
	noFill();
	stroke(66, 88, 160);
}

function draw() {
	bar.begin();
	push();
	translate(width/2, height/2);
	confusingClock();
	pop();
	dfx.run(glow, { radius: bar.glow, strength: 1.9 }, "GPU");

    bar.update();
}

function sBend(x, y, w, h) {
	push();
	translate(x, y);
	arc(-w/2, 0, w, h, 270, 0);
	translate(w/2, 0);
	arc(0, 0, w, h, 90, 180);
	pop();
}

function confusingClock() {
	background(0);
	push();
	rotate(a1);
	for (let i=0; i<360; i+=360/bar.arms) {
		drawArm(i, bar.angle);
	}
	a1 += 0.5;
	pop();
	rotate(a2);
	for (let i=0; i<360; i+=360/bar.arms) {
		drawArm(i, -bar.angle);
	}
	a2 -= 0.5;
}

function drawArm(angle, armAngle) {
	push();
	strokeWeight(bar.width);
	rotate(angle);
	if (armAngle > 0) 
		arc(0, -50, bar.linner, 100, 0, 180);
	else
		arc(0, -50, bar.linner, 100, 180, 360);
	translate(bar.linner, 0);
	rotate(armAngle);
	if (armAngle > 0)
		arc(0, -45, bar.louter, 90, 180, 360);
	else
		arc(0, -45, bar.louter, 90, 0, 180);
	pop();
}