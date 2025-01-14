let ui;
function setup() {
    createCanvas(windowWidth, windowHeight);
    colorMode(HSL, 360, 100, 100, 100);
    let bcolor = color("#38384C");
    let arrangement = {
        direction: "TB",
        height: windowHeight,
        width: windowWidth,
        children: [
            {
                size: 120,
                borderWidth: 0,
                textSize: 40,
                textFont: "Georgia",
                text: "David Fountain",
                color: bcolor
            },
            {
                children: [
                    new Frame(50),
                    new ColorRaffleBox(),
                    new Frame(30),
                    new BallSketch(),
                    new Frame(50)
                ]
            },
            new Frame(30),
            {
                children: [
                    new Frame(50),
                    new VoronoiSketch(),
                    new Frame(30),
                    {},
                    new Frame(50)
                ]
            },
            new Frame(50)
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

function mouseClicked() {
    ui.mouseClicked(mouseX, mouseY);
}
function mouseWheel(event) {
    ui.mouseWheel(mouseX, mouseY, event);
}