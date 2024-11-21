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
                textFont: "Georgia",
                text: "David Fountain",
                color: color("dimgray")
            },
            {
                children: [
                    {size: 50,
                        borderWidth: 0,
                        color: color("dimgray")
                    },
                    new ColorRaffleBox(),
                    {size: 30,
                     borderWidth: 0,
                     color: color("dimgray")
                    },
                    new BallSketch(),
                    {size:50,
                    borderWidth: 0,
                    color: color("dimgray")
                    }
                ]
            },
            {
                size: 50,
                color: color("dimgray"),
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