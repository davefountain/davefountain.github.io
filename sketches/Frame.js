class Frame extends Box {
    constructor(size = 50) {
        super();
        this.borderWidth = 0;
        this.size = size;
        this.color = color("#38384C")
    }
    update() {
        // Clear canvas
        super.update();
        let c = this.can;
        let area = c.width * c.height;
        let numSites = area * .005;

        // Setup
        let voronoi = new Voronoi();
        let bbox = {xl: 0, xr: c.width-1, yt: 0, yb: c.height-1};
        let sites = [];
        for (let i = 0; i < numSites; i++) {
            sites.push( {x: random(c.width), y: random(c.height)} );
        }
        let diagram = voronoi.compute(sites, bbox);

        c.noStroke();
        //  Cells
        for (let _cell of diagram.cells) {
            let h = hue(this.color);
            let s = saturation(this.color) + random(-15, 15);
            let l = lightness(this.color) + random(-15, 15);
            let tc = color(h, s, l);
            c.fill(tc);
            c.beginShape();
            c.vertex(_cell.halfedges[0].getStartpoint().x, _cell.halfedges[0].getStartpoint().y);
            for (let hes of _cell.halfedges) {
                c.vertex(hes.getEndpoint().x, hes.getEndpoint().y);
            }
            c.endShape();
        }
    }
}