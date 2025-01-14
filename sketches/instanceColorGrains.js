function instanceColorGrains (s)  {
    // let x = 100;
    // let y = 100;
    s.setup = function() {
        s.createCanvas(300, 300);
        s.colorMode(s.HSL, 360, 100, 100, 100);
        s.stroke("grey");
    };
    s.draw = function() {
        s.background("blue");
        for (let x = 0; x < s.width; x+=3) {
            for (let y = 0; y < s.height; y+=3) {
                s.point(x, y);
            }
        }
    };
    s.mouseClicked = function() {
        let c = s.color(s.map(s.mouseX, 0, s.width, 0, 360),
                        s.map(s.mouseY, 0, s.height, 0, 100),
                        50);
        console.log(s.mouseX);
        s.stroke(c);
    };

}
// Global (window)
let icg = new p5(instanceColorGrains, "instanceColorGrains");