function setup() {
  createCanvas(600, 600);
  noStroke();
}

function draw() {
  background(20);
  translate(width / 2, height / 2);
  for (let i = 1; i <= 10; i++) {
    const a = frameCount * 0.01 * i;
    fill(255, 255 - i * 15, 120 + i * 10);
    circle(cos(a) * i * 28, sin(a) * i * 28, 14);
  }
}
