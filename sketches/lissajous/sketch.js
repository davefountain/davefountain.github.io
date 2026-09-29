function setup() {
  createCanvas(600, 600);
  background(20);
  noStroke();
}

function draw() {
  fill(20, 20, 20, 12);
  rect(0, 0, width, height);
  const t = frameCount * 0.02;
  fill(120, 200, 255);
  circle(width / 2 + cos(t * 3) * 220, height / 2 + sin(t * 2) * 220, 6);
}
