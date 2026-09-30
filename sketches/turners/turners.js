let v1, v2, v3;
let a1, a2, a3;
let c1, c2;
let toggle = false;

function setup() {
	createCanvas(800, 800);
	angleMode(DEGREES);
	reset();
}

function draw() {
	if (frameCount % 3000 === 0) reset();
	v1.rotate(a1);
	v2.rotate(a2);
	v3.rotate(a3);
	push();
	translate(width / 2, height / 2);
	strokeWeight(2);
	stroke(c1);
	line(v1.x, v1.y, v2.x, v2.y)
	strokeWeight(1);
	stroke(c2);
	line(v1.x, v1.y, v3.x, v3.y)
	stroke(255, 255, 255, 10);
	line(v3.x, v3.y, v2.x, v2.y)
	pop();
}

function reset() {
	v1 = createVector(height * random(0.4, 0.45), 0);
	v2 = createVector(0, height * random(0.2, 0.4));
	v3 = createVector(-height * random(0.1, 0.3), 0);
	a1 = random(-20, 20)
	a2 = random(-20, 20)
	a3 = random(-20, 20)
	c1 = randomColor(20);
	c2 = compColor(c1);
	if (toggle) background(235);
	else background(20);
	toggle = !toggle;
}

function compColor(c) {
	// 1. Extract HSB and alpha values directly from the input color.
	// These functions always return standard HSB values (0-360, 0-100, 0-100).
	let h = hue(c);
	let s = saturation(c);
	let br = brightness(c);
	let a = alpha(c);
	// 2. Calculate the opposite hue
	let compH = (h + 180) % 360;
	// 3. Isolate the environment to build the new color object
	push();
	colorMode(HSB, 360, 100, 100, 255);
	// 4. Create the new color while safely in HSB mode
	let compColor = color(compH, s, br, a);
	pop(); // Restore the sketch's original colorMode
	return compColor;
}

function randomColor(a) {
	push();
	colorMode(HSB, 360, 100, 100, 255);
	let h = random(360);
	let s = random(50, 100);
	let br = random(50, 100);
	let rColor = color(h, s, br, a);
	pop();
	return rColor;
}