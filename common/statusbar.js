class StatusBar {
    constructor() {
        this.div = createDiv();
        this.div.style('background', '#222');
        this.div.style('color', '#ccc');
        this.div.style('font', '12px monospace');
        this.div.style('padding', '4px 8px');
        this.div.style('box-sizing', 'border-box');

        this.labels = [];   // labels whose text comes from a function
        this.avgFrame = 16.7;   // smoothed ms per frame
        this.avgBusy = 0;       // smoothed ms spent inside draw()
        this.startTime = 0;
        this.lastShown = 0;

    }
    addLabel(textOrFunc) {
        let span = createSpan('');
        span.parent(this.div);
        span.style('margin-left', '12px');
        if (typeof textOrFunc === 'function') {
            this.labels.push({ span: span, func: textOrFunc });
        } else {
            span.html(textOrFunc);
        }
        return this;
    }

    makeButton(label) {
        let button = createButton(label);
        button.parent(this.div);
        button.style('margin-left', '12px');
        button.style('vertical-align', 'middle');

        button.style('font', 'inherit');            // same monospace 12px as the bar
        button.style('color', '#ddd');
        button.style('background', '#333');
        button.style('border', '1px solid #555');
        button.style('border-radius', '3px');
        button.style('padding', '1px 8px');
        button.style('cursor', 'pointer');
        return button;
    }
    addButton(label, func) {
        this.makeButton(label).mousePressed(func);
        return this;
    }

    addToggleButton(label, altLabel, func) {
        let flipped = false;
        let button = this.makeButton(label);
        button.mousePressed(function () {
            flipped = !flipped;
            button.html(flipped ? altLabel : label);
            func(flipped);
        });
        return this;
    }


    // bar.addSlider('speed', 3, 0, 10);                                  // stored as bar.speed
    // bar.addSlider('speed', 3, 0, 10, { step: 0.5, label: 'Speed' });   // pick only what you need
    // bar.addSlider('radius', 12, 0, 30, { obj: uniforms });             // write into your uniforms
    addSlider(key, init, min, max, options) {
        options = options || {};
        let obj = options.obj || this;
        let step = options.step || 1;

        // decimals needed to show the step exactly: 1 -> 0, 0.5 -> 1, 0.25 -> 2
        let stepText = String(step);
        let decimals = stepText.includes('.') ? stepText.split('.')[1].length : 0;

        let labelSpan = createSpan(options.label || key);
        labelSpan.parent(this.div);
        labelSpan.style('margin-left', '12px');

        let slider = createSlider(min, max, init, step);
        slider.parent(this.div);
        slider.style('margin', '0 6px');
        slider.style('vertical-align', 'middle');
        slider.style('width', '60px');

        obj[key] = slider.value();

        let valueSpan = createSpan(slider.value().toFixed(decimals));
        valueSpan.parent(this.div);

        slider.input(function () {
            obj[key] = slider.value();
            valueSpan.html(slider.value().toFixed(decimals));
        });
        return this;
    }
    // ---------- presets ----------
    addFps() {
        let self = this;
        return this.addLabel(function () {
            return 'fps ' + (1000 / self.avgFrame).toFixed(0);
        });
    }

    addDrawTime() {
        let self = this;
        return this.addLabel(function () {
            return 'draw ' + self.avgBusy.toFixed(1) + 'ms';
        });
    }

    addFreeTime() {
        let self = this;
        return this.addLabel(function () {
            return 'free ' + (self.avgFrame - self.avgBusy).toFixed(1) + 'ms';
        });
    }

    addPrint() {
        return this.addButton('print', function () {
            saveCanvas('sketch', 'png');
        });
    }

    addPlayPause() {
        return this.addToggleButton('pause', 'play', function (flipped) {
            if (flipped) {
                noLoop();
            } else {
                loop();
            }
        });
    }

    begin() {
        this.startTime = performance.now();
    }

    update() {
        let busy = performance.now() - this.startTime;
        this.avgFrame = lerp(this.avgFrame, deltaTime, 0.05);
        this.avgBusy = lerp(this.avgBusy, busy, 0.05);

        let r = drawingContext.canvas.getBoundingClientRect();
        this.div.position(r.left + window.scrollX, r.bottom + window.scrollY);
        this.div.style('width', r.width + 'px');

        if (millis() - this.lastShown > 250) {
            this.lastShown = millis();
            for (let i = 0; i < this.labels.length; i++) {
                this.labels[i].span.html(this.labels[i].func());
            }
        }
    }
}