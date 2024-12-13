class VoronoiSketch extends Box {
    constructor() {
        super();
        this.direction = "TB";
        // Create and add the Heading subBox
        let arrangement = {
            direction: "LR",
            size: 50,  // Height
            children: [
                {
                    textSize: 20,
                    color: color("#264D73"),
                    borderWidth: 0,
                    text : "Voronoi"  }
            ]
        }
        let heading = Box.load(arrangement);
        this.addChild(heading);
        // Create and add the subBox that we will sketch on
        this.sketch = new Box();
        this.sketch.borderWidth = 0;
        this.sketch.color = "black";
        this.sketch.borderColor = color("grey");
        this.addChild(this.sketch);

    }
    update() {
        // Clear canvas
        super.update();
        let c = this.sketch.can;

        // Setup
        let voronoi = new Voronoi();
        let bbox = {xl: 0, xr: c.width-1, yt: 0, yb: c.height-1};
        let sites = [];
        for (let i = 0; i < 100; i++) {
            sites.push( {x: random(c.width), y: random(c.height)} );
        }
        let diagram = voronoi.compute(sites, bbox);

        c.noFill();
        c.strokeWeight(2);
        c.stroke("green")

        // Edges
        // for (let edge of diagram.edges) {
        //     c.line(edge.va.x, edge.va.y, edge.vb.x, edge.vb.y);
        // }

        //  Cells
        for (let _cell of diagram.cells) {
            c.fill(randomColor());
            c.beginShape();
            c.vertex(_cell.halfedges[0].getStartpoint().x, _cell.halfedges[0].getStartpoint().y);
            for (let hes of _cell.halfedges) {
                c.vertex(hes.getEndpoint().x, hes.getEndpoint().y);
            }
            c.endShape();
        }

        // Sites
        for (let site of sites) {
            c.fill("red");
            c.circle(site.x, site.y, 10);
        }

    }
}