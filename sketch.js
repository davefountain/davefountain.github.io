let ui;
function setup() {
    createCanvas(windowWidth, windowHeight);
    colorMode(HSL, 360, 100, 100, 100);
    let arrangement = {
        direction: "TB",
        height: windowHeight,
        width: windowWidth,
        children: [
            {
                size: 80,
                borderWidth: 0,
                textSize: 40,
                text: "David Fountain"
            },
            {
                children: [
                    {size: 50,
                    borderWidth: 0},
                    {borderWidth: 0},
                    new BallSketch(),
                    {size:50,
                    borderWidth: 0}
                ]
            },
            {
                size: 50,
                borderWidth: 0
            }
        ]
    }
    ui = Box.load(arrangement);
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