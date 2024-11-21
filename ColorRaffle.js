class ColorRaffleBox extends Box {
    constructor() {
        super();
        this.name = "colorRaffleBox";        // Creates the global variable "balls" to refer to this Box
        this.direction = "TB";
        this.pureColor = randomColor("pure");
        this.palette = palette(this.pureColor);
        // Create and add the Heading subBox
        let arrangement = {
            direction: "LR",
            size: 50,  // Height
            children: [
                {
                    textSize: 20,
                    color: randomColor(),
                    borderWidth: 0,
                    text : "Color Raffle"  }
            ]
        }
        let heading = Box.load(arrangement);
        this.addChild(heading);
        // Create and add the subBox that we will sketch on
        this.sketch = new Box();
        this.sketch.borderWidth = 0;
        this.sketch.borderColor = color("grey");
        this.addChild(this.sketch);
    }
    update() {
        super.update();
        let c = this.sketch.can;
        let gh = c.height/6;    // Rows
        let gw = c.width/7;     // Cols

        c.push();
        this.showPalette(c, gh, gw, "Pure", [this.palette.baseColor]);
        c.translate(0, gh + 5);
        this.showPalette(c, gh, gw, "Comp", [this.palette.complementaryColor]);
        c.translate(0, gh + 5);
        this.showPalette(c, gh, gw, "Tints", this.palette.tints);
        c.translate(0, gh + 5);
        this.showPalette(c, gh, gw, "Shades", this.palette.shades);
        c.translate(0, gh + 5);
        this.showPalette(c, gh, gw, "Tones", this.palette.tones);
        c.pop();
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

}