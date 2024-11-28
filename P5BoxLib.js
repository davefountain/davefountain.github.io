class Box {
    constructor() {
        this.parent = null;
        this._name = "";
        this._color = color("white");
        this._textColor = null;
        // Size and position
        this.size = -1;
        this.top = 0;
        this.left = 0;
        this.width = 0;
        this.height = 0;
        // Color and border attributes
        this.color = color("white");
        this.borderWidth = 1;
        this.borderColor = color("black");
        // Text attributes
        this.text = "";
        this.textSize = 16;
        this.textStyle = "normal";
        this.textFont = "Arial";
        // Animation related
        this.frameRate = 0;
        this.animationFunction = null;
        // Container related
        this.direction = "LR";
        this.children = [];
        this.can = createGraphics(this.width, this.height);
    }

    // Setters and getters
    set name(value) {
        this._name = value;
        if (value.length > 0) {
            window[value] = this;
        }
    }
    get name() {
        return this._name;
    }

    set color(value) {
        this._color = value;
    }
    get color() {
        return this._color;
    }

    set textColor(value) {
        this._textColor = value;
    }
    get textColor() {
        if (this._textColor !== null)
            return this._textColor;
        else {
            let _hue = (hue(this.color) + 180) % 360;
            let _sat = saturation(this.color);
            let _lum = (lightness(this.color) + 50) % 100;
            return color(_hue, _sat, _lum);
        }
    }

    addChild(child) {
        this.children.push(child);
        child.parent = this;
        this.can = null;        // No longer need canvas for container boxes
    }

    //-------------------------------------------------------
    // Does the actual drawing onto the box's drawing surface
    //-------------------------------------------------------
    update() {
        if (this.can !== null) {
            // Background filled rectangle
            this.can.fill(this.color);
            this.can.strokeWeight(0);
            this.can.rect(0, 0, this.width, this.height);

            // Border (crude)
            if (this.borderWidth > 0) {
                this.can.fill(this.borderColor);
                this.can.stroke(this.borderColor);
                this.can.strokeWeight(1);
                this.can.rect(0,0, this.width, this.borderWidth);   // Top
                this.can.rect(0,0, this.borderWidth, this.height);  // Left
                this.can.rect(0,this.height - 1 - this.borderWidth, this.width, this.height - 1);   // Bottom
                this.can.rect(this.width - 1 - this.borderWidth,0, this.width - 1, this.height);  // Right
            }

            // Text
            this.can.fill(this.textColor);
            this.can.noStroke();
            this.can.textSize(this.textSize);
            this.can.textStyle(this.textStyle);
            this.can.textFont(this.textFont);
            this.can.textAlign(CENTER, CENTER);
            this.can.text(this.text, this.width / 2, this.height / 2);
        }
        // Update all children as well
        for (let c of this.children) {
            c.update();
        }
    }

    //---------------------------------------------------
    // Puts the image of all the leaf boxes on the canvas
    //---------------------------------------------------
    show() {
        if ((this?.children?.length ?? 0) > 0) {
            // Show all children
            for (let c of this.children) {
                c.show();
            }
        } else {
           // Calculate relative position
            let x = 0;
            let y = 0;
            let p = this.parent;
            while (p != null) {
                x = x + p.left;
                y = y + p.top;
                p = p.parent;
            }
            // Show the local canvas on the main sketch canvas
            image(this.can, x + this.left, y + this.top);
        }
    }

    mouseClicked(x, y) {
        // If no children, just process the click and exit
        if (this.children.length === 0) {
            // console.log(`mouseClicked ${x},${y}`);
            return;
        }
        // Otherwise pass the click to the appropriate child
        for (let c of this.children) {
            let l = c.left;
            let r = c.left + c.width;
            let t = c.top;
            let b = c.top + c.height;
            if (x >= l && x < r && y >= t && y < b) {
                c.mouseClicked(x - l, y - t);
            }
        }
    }

    mouseWheel(x, y, event) {
        // If no children, just process the click and exit
        if (this.children.length === 0) {
            //console.log(`mouseWheel ${event.delta}`);
            return;
        }
        // Otherwise pass the click to the appropriate child
        for (let c of this.children) {
            let l = c.left;
            let r = c.left + c.width;
            let t = c.top;
            let b = c.top + c.height;
            if (x >= l && x < r && y >= t && y < b) {
                c.mouseWheel(x - l, y - t, event);
            }
        }
    }

    //---------------------------------------------------------------------------
    // Packs all the children of this box into it.  Also repacks every child box.
    //---------------------------------------------------------------------------
    repack() {
        // Calc reserved size needed
        let reservedSize = 0;
        let reservedN = 0;
        for (let c of this.children) {
            if (c.size > 0) {
                reservedSize += c.size;
                reservedN++;
            }
        }

        // Calc the size of the resizeable boxes
        let size = (this.direction === "TB") ? this.height : this.width;
        let availableSize = size - reservedSize;
        let n = this.children.length;
        let newSize = 0;
        if (n > reservedN)
            newSize = availableSize / (n - reservedN);
        let start = 0;

        // Set the height or width of each child according to the parent box direction
        if (this.direction === "LR") {
            for (let c of this.children) {
                c.height = this.height;
                c.left = start;
                c.width = (c.size === -1) ? newSize : c.size;
                start = start + c.width;
                c.can = createGraphics(c.width, c.height);
            }
        } else {
            for (let c of this.children) {
                c.width = this.width;
                c.top = start;
                c.height = (c.size === -1) ? newSize : c.size;
                start = start + c.height;
                c.can = createGraphics(c.width, c.height);
            }
        }

        // Repack each child box
        for (let c of this.children)
            c.repack();
    }

    static load(uiObject) {
        if (uiObject instanceof Box) {
            return uiObject;
        }
        let box = new Box();
        box.name = uiObject.name ?? box.name;
        box.direction = uiObject.direction ?? box.direction;
        box.width = uiObject.width ?? box.width;
        box.height = uiObject.height ?? box.height;
        box.size = uiObject.size ?? box.size;
        box.text = uiObject.text ?? box.text;
        box.textSize = uiObject.textSize ?? box.textSize;
        box.textStyle = uiObject.textStyle ?? box.textStyle;
        box.textFont = uiObject.textFont ?? box.textFont;
        box.color = uiObject.color ?? box.color;
        box.textColor = uiObject.textColor ?? box.textColor;
        box.borderWidth = uiObject.borderWidth ?? box.borderWidth;
        box.borderColor = uiObject.borderColor ?? box.borderColor;
        box.animationFunction = uiObject.animationFunction ?? box.animationFunction;
        box.frameRate = uiObject.frameRate ?? box.frameRate;

        if ((uiObject?.children?.length ?? 0) > 0) {
            // Add the child boxes
            for (let child of uiObject.children) {
                let childBox = Box.load(child);
                box.addChild(childBox);
            }
        }
        return box;
    }
}

// Color library
function randomColor(p1 = "") {
    let hue = random(360);
    let sat = random(100);
    let lum = random(100);
    if (p1 === "pure")
        return color(hue, 100, 50)
    else
        return color(hue, sat, lum);
}

function RGBToHex(r,g,b) {
    let _r = r.toString(16);
    let _g = g.toString(16);
    let _b = b.toString(16);
    if (_r.length === 1) _r = "0" + _r;
    if (_g.length === 1) _g = "0" + _g;
    if (_b.length === 1) _b = "0" + _b;
    return ("#" + _r + _g + _b).toUpperCase();
}
function palette(pureColor) {
    let _hue = hue(pureColor);
    return {
        baseColor: pureColor,
        complementaryColor: color((_hue + 180) % 360, 100, 50),
        tones: [
            color(_hue, 20, 50),
            color(_hue, 40, 50),
            color(_hue, 60, 50),
            color(_hue, 80, 50),
            color(_hue, 90, 50)
        ],
        tints: [
            color(_hue, 100, 60),
            color(_hue, 100, 70),
            color(_hue, 100, 80),
            color(_hue, 100, 90),
            color(_hue, 100, 95)
        ],
        shades: [
            color(_hue, 100, 10),
            color(_hue, 100, 20),
            color(_hue, 100, 30),
            color(_hue, 100, 40),
            color(_hue, 100, 45)
        ]
    }
}

// Math functions
function clamp(val, min, max) {
    if (val > max) return max;
    if (val < min) return min;
    return val;
}