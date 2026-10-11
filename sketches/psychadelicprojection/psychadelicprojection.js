let photo;
let paused = false;
let bar;
let dfx;

function setup() {
	createCanvas(800, 800);
    bar = new StatusBar();
    //bar.addToggleButton('Posterize: Off', 'Posterize:On', function() {bar.posterize = !bar.posterize;});
	bar.addSlider('levels', 10, 0, 20, {step: 2});
    bar.addSlider('rate', 10, -20, 20);
    bar.addSlider('stroke_weight', 1, 0, 10);
    bar.addSlider('opacity', 4, 0, 10);
    bar.addSlider('rotation', 0, -5, 5);
	dfx = new DFX();
	angleMode(DEGREES);
	colorMode(HSL, 359, 100, 100);
	background(255);
	photo = get();
}

function draw() {

    // Draw buffer on canvas with rotation (imageMode=CENTER, hence translate to center first)
    // The zoom effect is achieved by scaling the size of the image based on the 'rate' slider
    push();
	imageMode(CENTER);
	translate(width/2, height/2);
	rotate(bar.rotation/5);
	image(photo, 0, 0, width - bar.rate, height - bar.rate);
	pop();

    // Choose a place to draw a circle, with some randomness
	let x = width / 2 + random(-1, 1) * width * 0.4;
	let y = height / 2 + random(-1, 1) * height * 0.4;
	translate(x, y);

    // Draw a circle with random color and size
	fill(frameCount % 6 * 60, 100, 70, bar.opacity / 10);
	strokeWeight(bar.stroke_weight);
	circle(0, 0, random(100));

    // Posterize the canvas if needed
	if (bar.levels != 0) 
		filter(POSTERIZE, bar.levels);	// This is the built-in p5.js filter.
		//dfx.run(PosterizeFilter, {levels: bar.levels, contrast: 0.0}, "GPU");

    // Capture the current canvas into the buffer for the next frame
	photo = get();
}