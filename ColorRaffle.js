class ColorRaffleBox extends Box {
    constructor() {
        super();
        this.direction = "TB";
        this.sat = 50;
        // Create and add the Heading subBox
        let headerArrangement = {
            direction: "LR",
            size: 50,  // Height
            children: [
                {
                    textSize: 20,
                    color: randomColor(),
                    borderWidth: 0,
                    text : "Recursive hexagonal color palette"  }
            ]
        }
        let heading = Box.load(headerArrangement);
        this.addChild(heading);
        // Create and add the subBox that we will sketch on
        this.sketch = new Box();
        this.sketch.borderWidth = 0;
        this.sketch.borderColor = color("grey");
        this.addChild(this.sketch);
        let footerArrangement = {
            direction: "LR",
            size: 40,  // Height
            children: [
                {
                    textSize: 15,
                    borderWidth: 0,
                    size: 120,
                    text : "Saturation"  },
                {
                    textSize: 15,
                    borderWidth: 0,
                    text : "Use the scroll wheel to adjust the saturation"  }
            ]
        }
        let footer = Box.load(footerArrangement);
        this.satBox = footer.children[0];
        this.addChild(footer);
    }
    update() {
        super.update();
        let c = this.sketch.can;
        this.recursiveHexagon(c.width/2, c.height/2, 3, c.width/4);
    }
    showPalette(c, gh, gw, txt, palette) {
        c.push();
        c.fill("black");
        c.textAlign(CENTER, CENTER);
        c.text(txt, 0, 0, gw, gh);
        for (let i = 0; i < palette.length; i++) {
            c.fill(palette[i]);
            c.rect((i + 1) * gw, 0, gw, gh);
        }
        c.pop();
    }

    drawHexagon(cX, cY, r, hexColor){
        // Based on https://www.gorillasun.de/blog/a-guide-to-hexagonal-grids-in-p5js/
        let c = this.sketch.can;
        c.push();
        c.fill(hexColor);
        c.noStroke();
        c.beginShape();
        for(let a = 0; a < TAU; a+=TAU/6) {
            c.vertex(cX + r * cos(a), cY + r * sin(a));
        }
        c.endShape(CLOSE);
        c.pop();
    }
    recursiveHexagon(cX, cY, depth, r) {
        // Based on https://www.gorillasun.de/blog/a-guide-to-hexagonal-grids-in-p5js/
        if (depth === 0) {
            // Draw the actual hexagon using the right color
            let radToDeg = 180 / PI;
            let vec = createVector(this.sketch.can.width/2 - cX, this.sketch.can.height/2 - cY);
            let _hue = vec.heading() * radToDeg + 180;
            let _lum = map(vec.mag(), 0, this.sketch.can.width/4, 0, 60);
            let hexColor= color(_hue, this.sat, _lum);
            this.drawHexagon(cX, cY, r, hexColor);
        } else {
            // One for the middle
            this.recursiveHexagon(cX, cY, depth - 1, r/2);
            // One for each side of the parent hexagon
            for (let angle = 0; angle < TAU; angle+=TAU/6) {
                let x = cX + r * cos(angle + TAU/12);  // TAU/12 adjustment is to rotate angle from
                let y = cY + r * sin(angle + TAU/12);  // the vertex to the midpoint of the side
                this.recursiveHexagon(x, y, depth - 1, r / 2);
            }
        }
    }

    mouseWheel(x, y, event) {
        if (event.delta > 0)
            this.sat = clamp(this.sat-5, 0, 100);
        else
            this.sat = clamp(this.sat+5, 0, 100);
        this.satBox.text = "Saturation: " + this.sat.toFixed(0);
        this.update();
        this.show();
    }
}