function setup() {
	createCanvas(1280, 720);
	angleMode(DEGREES);
	background(20);
	frameRate(10);
}

function draw() {
	let symmetry = 6;
	// Translate origin to canvas center
	translate(width / 2, height / 2);

	let mx = random(0, width);
	let my = random(0, height);
	let pmx = random(0, width);
	let pmy = random(0, height);

	let angle = 360 / symmetry;

	stroke(random(255), random(150), random(200));
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