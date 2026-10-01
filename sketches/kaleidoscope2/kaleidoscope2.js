function setup() {
	createCanvas(1280, 720);
	colorMode(HSB, 255);
	blendMode(SOFT_LIGHT);
	angleMode(DEGREES);
	background(235);
	frameRate(5);
}

function draw() {
	let symmetry = 12;
	// Translate origin to canvas center
	translate(width / 2, height / 2);

	let mx = random(0, width);
	let my = random(0, height);
	let pmx = random(0, width);
	let pmy = random(0, height);

	let angle = 360 / symmetry;

	stroke(random(255), 255, 200, 99);
	strokeWeight(random(20));
	for (let i = 0; i < symmetry; i++) {
		push();
		rotate(i * angle);
		line(mx, my, pmx, pmy);
		scale(-1, 1);
		line(mx, my, pmx, pmy);
		pop();
	}

}