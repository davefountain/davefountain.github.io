class Ball {
    constructor(x, y, vx, vy, r, letter) {
        this.pos = createVector(x, y);
        this.vel = createVector(vx, vy);
        this.r = r;
        this.mass = PI * sq(r);
        let pal = ["#7FC6CE","#4DBCBC","#389382","#2A6F4D","#246024","#4D6F2A","#829338", "#BCBC4D", "#CEC67F"];
        this.color = color(random(pal));
        this.letter = letter;
    }
    energy() {
        return 0.5 * this.mass * sq(this.vel.mag());  // calculate when needed
    }
    momentum() {
        return p5.Vector.mult(this.vel, this.mass).mult(0.02)
    }

    update(canWidth, canHeight) {
        this.pos.add(this.vel);
        let x = Ball.wrap(this.pos.x, -this.r, canWidth+this.r)
        let y = Ball.wrap(this.pos.y, -this.r, canHeight+this.r)
        this.pos.set(x, y)
    }
    show(can) {
        can.push();
        can.stroke("black");
        can.fill(this.color);
        can.strokeWeight(2);
        can.circle(this.pos.x, this.pos.y, this.r * 2);
        can.fill("black");
        can.noStroke();
        can.text(this.letter, this.pos.x, this.pos.y);
        can.pop();
    }
    static wrap(n, min, max) {
        // Performs modulo arithmetic on n in the range min to max
        let divisor = max - min
        n = n - min
        let modulo = ((n % divisor) + divisor) % divisor
        return modulo + min
    }
    static areColliding(ballA, ballB) {
        return ballA.pos.dist(ballB.pos) < ballA.r + ballB.r;
    }
    static elastic_collision(m, n, v) {
        // m = mass1, n = mass2, v = velocity1. Velocity2 MUST BE 0
        let x = v * (m - n) / (m + n);
        let y = v + x;
        return [x, y];
    }
    static handleCollision(ball1, ball2) {
        // Change to a new FoR in which ball2 is at rest
        let vel_adj = ball2.vel.copy();
        ball1.vel.sub(vel_adj);
        ball2.vel.sub(vel_adj);
        // Now change to a new FoR in which ball2 is at the origin
        let pos_adj = ball2.pos.copy();
        ball1.pos.sub(pos_adj);
        ball2.pos.sub(pos_adj);
        // Rotate frame of reference so the point of collision is on x-axis and > 0
        let angle_adj = ball1.pos.heading();
        ball1.pos.rotate(-angle_adj);
        ball1.vel.rotate(-angle_adj);
        // Handle the collision in the new FoR
        let [v1f, v2f] = Ball.elastic_collision(ball1.mass, ball2.mass, ball1.vel.x);
        ball1.vel.x = v1f;
        ball2.vel.x = v2f;
        // Remove overlap
        ball1.pos.x = ball2.r + ball1.r + 0.01;
        // Switch back to the original FoR
        ball1.pos.rotate(angle_adj);
        ball1.vel.rotate(angle_adj);
        ball2.vel.rotate(angle_adj);
        ball1.pos.add(pos_adj);
        ball2.pos.add(pos_adj);
        ball1.vel.add(vel_adj);
        ball2.vel.add(vel_adj);
    }
}

class BallSketch extends Box {
    constructor() {
        super();
        this.name = "balls";        // Creates the global variable "balls" to refer to this Box
        this.direction = "TB";
        this.paused = false;
        // Create and add the Heading subBox
        let arrangement = {
            direction: "LR",
            size: 50,  // Height
            children: [
                {
                    textSize: 20,
                    color: color("#E2D9B3"),
                    borderWidth: 0,
                    text : "Conserved: Energy & Momentum"  }
            ]
        }
        let heading = Box.load(arrangement);
        this.addChild(heading);
        // Create and add the subBox that we will sketch on
        this.sketch = new Box();
        this.sketch.borderWidth = 0;
        this.sketch.color = "ivory";
        this.sketch.borderColor = color("grey");
        this.addChild(this.sketch);

        // Set up footer boxes to display energy and momentum
        this.momentum = new Box();
        this.momentum.borderWidth = 2;
        this.momentum.borderColor = color("#264D73");
        this.momentum.color = color("ivory");
        this.energy = new Box();
        this.energy.borderWidth = 0;
        this.energy.color = color("#6b5998");
        let footer = new Box();
        footer.direction = "LR";
        footer.borderWidth = 0;
        footer.addChild(this.momentum);
        footer.addChild(this.energy);
        this.addChild(footer);

        // Populate the balls array
        this.ballMessage = "MOMENTUM";
        this.ballsArray = [];
        for (let i = 0; i < this.ballMessage.length; i++)
            this.ballsArray[i] = new Ball(i*50 + 25, 300, 0, 0, 20, this.ballMessage.slice(i, i+1));
        this.ballsArray.push(new Ball(30, 30, 1, 3, 25, "!"));
        this.ballsArray[this.ballsArray.length-1].color = color("#4DBCBC");
    }
    update() {

        // Bail out if we are paused
        if (this.paused) return;

        // Clear canvas
        super.update();

        // Move every ball
        for (let ball of this.ballsArray) {
            ball.update(this.sketch.can.width, this.sketch.can.height);
        }
        // Check for and handle collisions
        for (let i = 0; i < this.ballsArray.length; i++)
            for (let j = i+1; j < this.ballsArray.length; j++)
                if (Ball.areColliding(this.ballsArray[i], this.ballsArray[j]))
                    Ball.handleCollision(this.ballsArray[i], this.ballsArray[j]);
        // Draw every ball
        let totalEnergy = 0;
        for (let ball of this.ballsArray) {
            ball.show(this.sketch.can);
            totalEnergy += ball.energy();
        }

        // Show momentum
        let mc = this.momentum.can;
        let origin = createVector(mc.width/2, mc.height/2);
        let startPoint = origin.copy();
        let endPoint;
        for (let ball of this.ballsArray) {
            endPoint = p5.Vector.add(startPoint, ball.momentum());
            this.arrow(startPoint.x, startPoint.y, endPoint.x, endPoint.y, 3, ball.letter, ball.color);
            startPoint = endPoint;
        }
    }
    arrow(x1, y1, x2, y2, offset, txt, aColor) {
        let c = this.momentum.can;
        c.push()
        c.fill(aColor);
        c.strokeWeight(1);
        c.stroke("gray");
        c.line(x1,y1,x2,y2)
        let angle = atan2(y1 - y2, x1 - x2);
        c.translate(x2, y2);
        c.rotate(angle - HALF_PI);
        c.triangle(-offset * 0.6, offset*1.5, offset * 0.6, offset*1.5, 0, 0);
        // Text background (circle)
        c.rotate(-PI/2);
        c.stroke(aColor);
        c.fill("ivory");
        c.circle(-15, 0, 12);
        // Text
        c.fill(aColor);
        c.noStroke();
        c.textSize(9);
        c.text(txt, -15, 0)
        c.pop();
    }

    mouseClicked(x, y) {
        this.paused = !this.paused;
    }
}