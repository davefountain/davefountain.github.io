
/**
 * 
 * @param {number} startX The x-axis coordinate of the start point.
 * @param {number} startY The y-axis coordinate of the start point.
 * @param {number} endX The x-axis coordinate of the end point.
 * @param {number} endY The y-axis coordinate of the end point.
 * @param {color[]} colors List of colors (A color value representing the color of the stop.)
 * @param {number[]} stops List of color stops (numbers between 0 and 1, inclusive, representing the position of the color stop. 0 represents the start of the gradient and 1 represents the end.)
 */
function fillLinear(startX, startY, endX, endY, colors, stops) {
    let gradient = drawingContext.createLinearGradient(startX, startY, endX, endY);
    if (colors.length != stops.length) {
        throw new Error("fillLinear: number of colors should equal number of stops");
    }
    for (let i = 0; i < colors.length; i++) {
        gradient.addColorStop(stops[i], colors[i]);
    }
    drawingContext.fillStyle = gradient;
}
/**
 * 
 *  @param {number} startX The x-axis coordinate of the start circle.
 * @param {number} startY The y-axis coordinate of the start circle.
 * @param {number} startRadius The radius of the start circle. Must be non-negative and finite.
 * @param {number} endX The x-axis coordinate of the end circle.
 * @param {number} endY The y-axis coordinate of the end circle.
 * @param {number} endRadius The radius of the end circle. Must be non-negative and finite.
 * @param {color[]} colors List of colors (A color value representing the color of the stop.)
 * @param {number[]} stops List of color stops (numbers between 0 and 1, inclusive, representing the position of the color stop. 0 represents the start of the gradient and 1 represents the end.)
 */
function fillRadial(startX, startY, startRadius, endX, endY, endRadius, colors, stops) {
    let gradient = drawingContext.createRadialGradient(startX, startY, startRadius, endX, endY, endRadius);
    if (colors.length != stops.length) {
        throw new Error("fillRadial: number of colors should equal number of stops");
    }
    for (let i = 0; i < colors.length; i++) {
        gradient.addColorStop(stops[i], colors[i]);
    }
    drawingContext.fillStyle = gradient;
}

/**
 * 
 * @param {number} x The x-axis coordinate of the center of the gradient.
 * @param {number} y The y-axis coordinate of the center of the gradient.
 * @param {number} startAngle The angle at which to begin the gradient, in degrees. The angle starts from a line going horizontally right from the center, and proceeds clockwise.
 * @param {color[]} colors List of colors (A color value representing the color of the stop.)
 * @param {number[]} stops List of color stops (numbers between 0 and 1, inclusive, representing the position of the color stop. 0 represents the start of the gradient and 1 represents the end.)
 */
function fillConic(x, y, startAngle, colors, stops) {
    let gradient = drawingContext.createConicGradient(radians(startAngle), x, y);
    if (colors.length != stops.length) {
        throw new Error("fillConic: number of colors should equal number of stops");
    }
    for (let i = 0; i < colors.length; i++) {
        gradient.addColorStop(stops[i], colors[i]);
    }
    drawingContext.fillStyle = gradient;
}
