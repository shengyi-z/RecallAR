// Polygon Triangulation using Earcut Algorithm
// Optimized for simple polygon triangulation (no holes)

/**
 * Triangulate a polygon into triangles
 * @param {Array} vertices - Flat array of vertex coordinates [x1, y1, x2, y2, ...]
 * @returns {Array} - Array of triangle indices (every 3 indices form a triangle)
 */
function triangulate(vertices) {
    const n = vertices.length / 2;
    if (n < 3) return [];
    
    const indices = [];
    
    // Handle simple cases
    if (n === 3) {
        return [0, 1, 2];
    }
    
    // Create a circular doubly-linked list from polygon points
    let last = null;
    for (let i = 0; i < n; i++) {
        const x = vertices[i * 2];
        const y = vertices[i * 2 + 1];
        last = insertNode(i, x, y, last);
    }
    
    if (!last || last.next === last.prev) return indices;
    
    // Earcut the polygon
    earcutLinked(last, indices, 0);
    
    return indices;
}

// Node structure for linked list
function Node(i, x, y) {
    this.i = i;      // vertex index
    this.x = x;      // x coordinate
    this.y = y;      // y coordinate
    this.prev = null;
    this.next = null;
    this.z = null;   // z-order curve value
    this.prevZ = null;
    this.nextZ = null;
    this.steiner = false;
}

// Create a node and optionally link it with a previous one
function insertNode(i, x, y, last) {
    const p = new Node(i, x, y);
    
    if (!last) {
        p.prev = p;
        p.next = p;
    } else {
        p.next = last.next;
        p.prev = last;
        last.next.prev = p;
        last.next = p;
    }
    return p;
}

// Main ear slicing loop
function earcutLinked(ear, indices, pass) {
    if (!ear) return;
    
    // Iterate through ears, slicing them one by one
    let stop = ear;
    let prev, next;
    
    while (ear.prev !== ear.next) {
        prev = ear.prev;
        next = ear.next;
        
        if (isEar(ear)) {
            // Output triangle
            indices.push(prev.i, ear.i, next.i);
            
            // Remove ear node
            removeNode(ear);
            
            // Skip to next ear
            ear = next.next;
            stop = next.next;
            
            continue;
        }
        
        ear = next;
        
        // If we looped through all nodes and can't find any more ears
        if (ear === stop) {
            // Try filtering points and slicing again
            if (!pass) {
                earcutLinked(filterPoints(ear), indices, 1);
            } else if (pass === 1) {
                ear = cureLocalIntersections(filterPoints(ear), indices);
                earcutLinked(ear, indices, 2);
            }
            break;
        }
    }
}

// Check if a polygon node forms a valid ear
function isEar(ear) {
    const a = ear.prev;
    const b = ear;
    const c = ear.next;
    
    if (area(a, b, c) >= 0) return false; // Reflex angle
    
    // Now check if it doesn't contain any other points
    let p = ear.next.next;
    
    while (p !== ear.prev) {
        if (pointInTriangle(a.x, a.y, b.x, b.y, c.x, c.y, p.x, p.y) &&
            area(p.prev, p, p.next) >= 0) {
            return false;
        }
        p = p.next;
    }
    
    return true;
}

// Check if a point is inside a triangle
function pointInTriangle(ax, ay, bx, by, cx, cy, px, py) {
    return (cx - px) * (ay - py) - (ax - px) * (cy - py) >= 0 &&
           (ax - px) * (by - py) - (bx - px) * (ay - py) >= 0 &&
           (bx - px) * (cy - py) - (cx - px) * (by - py) >= 0;
}

// Check if a diagonal between two polygon nodes is valid
function isValidDiagonal(a, b) {
    return a.next.i !== b.i && a.prev.i !== b.i && !intersectsPolygon(a, b) &&
           locallyInside(a, b) && locallyInside(b, a) && middleInside(a, b);
}

// Signed area of a triangle
function area(p, q, r) {
    return (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
}

// Check if two segments intersect
function intersects(p1, q1, p2, q2) {
    const o1 = sign(area(p1, q1, p2));
    const o2 = sign(area(p1, q1, q2));
    const o3 = sign(area(p2, q2, p1));
    const o4 = sign(area(p2, q2, q1));
    
    if (o1 !== o2 && o3 !== o4) return true;
    
    return false;
}

// Check if a polygon diagonal intersects with any existing edges
function intersectsPolygon(a, b) {
    let p = a;
    do {
        if (p.i !== a.i && p.next.i !== a.i && p.i !== b.i && p.next.i !== b.i &&
            intersects(p, p.next, a, b)) {
            return true;
        }
        p = p.next;
    } while (p !== a);
    
    return false;
}

// Check if a polygon diagonal is locally inside the polygon
function locallyInside(a, b) {
    return area(a.prev, a, a.next) < 0 ?
        area(a, b, a.next) >= 0 && area(a, a.prev, b) >= 0 :
        area(a, b, a.prev) < 0 || area(a, a.next, b) < 0;
}

// Check if the middle point of a polygon diagonal is inside the polygon
function middleInside(p, q) {
    let a = p;
    let inside = false;
    const px = (p.x + q.x) / 2;
    const py = (p.y + q.y) / 2;
    
    do {
        const sx = a.x;
        const sy = a.y;
        const ex = a.next.x;
        const ey = a.next.y;
        
        if (((sy > py) !== (ey > py)) && (px < (ex - sx) * (py - sy) / (ey - sy) + sx)) {
            inside = !inside;
        }
        a = a.next;
    } while (a !== p);
    
    return inside;
}

// Link two polygon nodes with a bridge
function splitPolygon(a, b) {
    const a2 = new Node(a.i, a.x, a.y);
    const b2 = new Node(b.i, b.x, b.y);
    const an = a.next;
    const bp = b.prev;
    
    a.next = b;
    b.prev = a;
    
    a2.next = an;
    an.prev = a2;
    
    b2.next = a2;
    a2.prev = b2;
    
    bp.next = b2;
    b2.prev = bp;
    
    return b2;
}

// Remove a node from the linked list
function removeNode(p) {
    p.next.prev = p.prev;
    p.prev.next = p.next;
    
    if (p.prevZ) p.prevZ.nextZ = p.nextZ;
    if (p.nextZ) p.nextZ.prevZ = p.prevZ;
}

// Filter out superfluous points (collinear or duplicate)
function filterPoints(start, end) {
    if (!start) return start;
    if (!end) end = start;
    
    let p = start;
    let again;
    
    do {
        again = false;
        
        if (equals(p, p.next) || area(p.prev, p, p.next) === 0) {
            removeNode(p);
            p = end = p.prev;
            if (p === p.next) break;
            again = true;
        } else {
            p = p.next;
        }
    } while (again || p !== end);
    
    return end;
}

// Try to split polygon and triangulate independently
function cureLocalIntersections(start, indices) {
    let p = start;
    
    do {
        const a = p.prev;
        const b = p.next.next;
        
        if (!equals(a, b) && intersects(a, p, p.next, b) && locallyInside(a, b) && locallyInside(b, a)) {
            indices.push(a.i, p.i, b.i);
            
            // Remove p and p.next
            removeNode(p);
            removeNode(p.next);
            
            p = start = b;
        }
        p = p.next;
    } while (p !== start);
    
    return filterPoints(p);
}

// Check if two points are equal
function equals(p1, p2) {
    return p1.x === p2.x && p1.y === p2.y;
}

// Get the sign of a number
function sign(num) {
    return num > 0 ? 1 : num < 0 ? -1 : 0;
}

// Export the triangulation function
module.exports = {
    triangulate
};

