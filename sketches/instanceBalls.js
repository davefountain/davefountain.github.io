function instanceBalls ( sketch )  {
    let x = 100;
    let y = 100;

    sketch.setup = function() {
        sketch.createCanvas(300, 300);
    };

    sketch.draw = function() {
        sketch.background(0);
        sketch.fill("blue");
        sketch.circle(x,y,50);
    };
}

let ib = new p5(instanceBalls, "instanceBalls");