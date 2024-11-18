let ui;
function setup() {
    createCanvas(windowWidth, windowHeight);
    colorMode(HSL, 360, 100, 100, 100);
    ui = new Box();
    ui.height = windowHeight;
    ui.width = windowWidth;
    let bs = new BallSketch();
    ui.addChild(bs);
    ui.repack();
    ui.update();
    ui.show();
}

function draw() {
    balls.update();
    balls.show();
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    ui.width = windowWidth;
    ui.height = windowHeight;
    ui.repack();
    ui.update();
    ui.show();
}

function randomColor() {
    return color(random(360), random(100), random(100));
}