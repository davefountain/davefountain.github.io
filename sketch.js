let ui;
function setup() {
    createCanvas(windowWidth-10, windowHeight-10);
    colorMode(HSL, 360, 100, 100, 100);
    ui = new Box();
    ui.height = windowHeight-10;
    ui.width = windowWidth-10;
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
    resizeCanvas(windowWidth-10, windowHeight-10);
    ui.width = windowWidth-10;
    ui.height = windowHeight-10;
    ui.repack();
    ui.update();
    ui.show();
}

function randomColor() {
    return color(random(360), random(100), random(100));
}