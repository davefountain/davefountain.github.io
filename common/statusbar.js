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

    addButton(label, func) {
        let button = createButton(label);
        button.parent(this.div);
        button.style('margin-left', '12px');
        button.style('vertical-align', 'middle');
        button.mousePressed(func);
        return this;
    }

    addSlider(label, min, max, obj, key, step) {
        let labelSpan = createSpan(label);
        labelSpan.parent(this.div);
        labelSpan.style('margin-left', '12px');

        let slider = createSlider(min, max, obj[key], step || 0);
        slider.parent(this.div);
        slider.style('margin', '0 6px');
        slider.style('vertical-align', 'middle');

        let valueSpan = createSpan(slider.value().toFixed(2));
        valueSpan.parent(this.div);

        slider.input(function () {
            obj[key] = slider.value();
            valueSpan.html(slider.value().toFixed(2));
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
        let button = createButton('pause');
        button.parent(this.div);
        button.style('margin-left', '12px');
        button.style('vertical-align', 'middle');
        button.mousePressed(function () {
            if (isLooping()) {
                noLoop();
                button.html('play');
            } else {
                loop();
                button.html('pause');
            }
        });
        return this;
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