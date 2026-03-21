// Canvas Rendering Functions
// Basic vector rendering with fringe anti-aliasing
// Optimized with vec2/vec3 API

// Import triangulator for non-convex polygon filling
const { triangulate } = require('./Triangulator');

// Line cap style constants
const CAP_ROUND = 'round';
const CAP_SQUARE = 'square';

// Line join style constants
const JOIN_MITER = 'miter';
const JOIN_BEVEL = 'bevel';
const JOIN_ROUND = 'round';

// Threshold constants (squared for performance)
const EPSILON = 0.0001;
const EPSILON_SQ = EPSILON * EPSILON;

// Pre-computed constants
const PI = Math.PI;
const TWO_PI = PI * 2;
const HALF_PI = PI / 2;

// ============================================================================
// Rendering Functions
// ============================================================================

function renderLine(canvas, x1, y1, x2, y2) {
    // Convert to world coordinates
    const p1 = canvas._toWorld(x1, y1);
    const p2 = canvas._toWorld(x2, y2);
    
    // Calculate line direction using vec2 API
    const delta = p2.sub(p1);
    const lenSq = delta.lengthSquared;
    
    if (lenSq < EPSILON_SQ) return;
    
    const len = Math.sqrt(lenSq);
    const dir = delta.uniformScale(1 / len);
    const norm = new vec2(-dir.y, dir.x);
    
    // Half width and fringe in world units (converted from pixels)
    const halfWidth = canvas._pixelsToWorld(canvas._getScaledStrokeWidth());
    const fringeW = canvas._pixelsToWorld(canvas.currentFringeWidth);
    
    const color = canvas.doStroke ? canvas.strokeColor : new vec4(0, 0, 0, 0);
    const useFringe = fringeW > 0;
    
    // Create stroke with fringe for anti-aliasing
    const w0 = halfWidth + fringeW;  // outer (fringe)
    const w1 = halfWidth;             // inner (solid)
    
    // For CAP_SQUARE caps, extend the line endpoints by halfWidth
    let ep1 = p1;
    let ep2 = p2;
    if (canvas.lineCapStyle === CAP_SQUARE) {
        ep1 = p1.sub(dir.uniformScale(halfWidth));
        ep2 = p2.add(dir.uniformScale(halfWidth));
    }
    
    const startIdx = canvas.vertexCount;
    
    if (useFringe) {
        // Outer fringe vertices (transparent)
        const normW0 = norm.uniformScale(w0);
        const normW1 = norm.uniformScale(w1);
        
        canvas._addVertex(ep1.x + normW0.x, ep1.y + normW0.y, 0, color.r, color.g, color.b, 0, 0, 0, -1.0, 1.0);
        canvas._addVertex(ep1.x - normW0.x, ep1.y - normW0.y, 0, color.r, color.g, color.b, 0, 0, 0, -1.0, 1.0);
        canvas._addVertex(ep2.x + normW0.x, ep2.y + normW0.y, 0, color.r, color.g, color.b, 0, 0, 0, -1.0, 1.0);
        canvas._addVertex(ep2.x - normW0.x, ep2.y - normW0.y, 0, color.r, color.g, color.b, 0, 0, 0, -1.0, 1.0);
        
        // Inner solid vertices
        canvas._addVertex(ep1.x + normW1.x, ep1.y + normW1.y, 0, color.r, color.g, color.b, color.a, 0, 0, -1.0, 0.0);
        canvas._addVertex(ep1.x - normW1.x, ep1.y - normW1.y, 0, color.r, color.g, color.b, color.a, 0, 0, -1.0, 0.0);
        canvas._addVertex(ep2.x + normW1.x, ep2.y + normW1.y, 0, color.r, color.g, color.b, color.a, 0, 0, -1.0, 0.0);
        canvas._addVertex(ep2.x - normW1.x, ep2.y - normW1.y, 0, color.r, color.g, color.b, color.a, 0, 0, -1.0, 0.0);
        
        // Fringe triangles (top and bottom edges)
        canvas.indices.push(startIdx+0, startIdx+4, startIdx+2);
        canvas.indices.push(startIdx+4, startIdx+6, startIdx+2);
        canvas.indices.push(startIdx+1, startIdx+3, startIdx+5);
        canvas.indices.push(startIdx+5, startIdx+3, startIdx+7);
        
        // Core triangles
        canvas.indices.push(startIdx+4, startIdx+5, startIdx+6);
        canvas.indices.push(startIdx+5, startIdx+7, startIdx+6);
    } else {
        const normW1 = norm.uniformScale(w1);
        
        // No fringe - just solid vertices and triangles
        canvas._addVertex(ep1.x + normW1.x, ep1.y + normW1.y, 0, color.r, color.g, color.b, color.a, 0, 0, -1.0, 0.0);
        canvas._addVertex(ep1.x - normW1.x, ep1.y - normW1.y, 0, color.r, color.g, color.b, color.a, 0, 0, -1.0, 0.0);
        canvas._addVertex(ep2.x + normW1.x, ep2.y + normW1.y, 0, color.r, color.g, color.b, color.a, 0, 0, -1.0, 0.0);
        canvas._addVertex(ep2.x - normW1.x, ep2.y - normW1.y, 0, color.r, color.g, color.b, color.a, 0, 0, -1.0, 0.0);
        
        // Core triangles only
        canvas.indices.push(startIdx+0, startIdx+1, startIdx+2);
        canvas.indices.push(startIdx+1, startIdx+3, startIdx+2);
    }
    
    // Add caps based on style
    if (canvas.lineCapStyle === CAP_ROUND) {
        // Round caps at both ends (use original p1/p2)
        renderRoundCap(canvas, p1.x, p1.y, dir.x, dir.y, halfWidth, fringeW, color, false, useFringe);
        renderRoundCap(canvas, p2.x, p2.y, dir.x, dir.y, halfWidth, fringeW, color, true, useFringe);
    } else if (canvas.lineCapStyle === CAP_SQUARE && useFringe) {
        // Square caps - add end fringe at extended endpoints (only if using fringe)
        renderSquareCapFringe(canvas, ep1.x, ep1.y, -dir.x, -dir.y, norm.x, norm.y, halfWidth, fringeW, color);
        renderSquareCapFringe(canvas, ep2.x, ep2.y, dir.x, dir.y, norm.x, norm.y, halfWidth, fringeW, color);
    }
}

// Render a round cap (semicircle) at the given point
// isEnd: true for end cap (faces forward), false for start cap (faces backward)
// useFringe: if false, skip fringe rendering
function renderRoundCap(canvas, cx, cy, dirX, dirY, halfWidth, fringeW, color, isEnd, useFringe = true) {
    const segments = 8;
    const angleStep = PI / segments;
    
    // Calculate the base angle - the direction the cap faces
    const capDirX = isEnd ? dirX : -dirX;
    const capDirY = isEnd ? dirY : -dirY;
    
    const baseAngle = Math.atan2(capDirY, capDirX);
    const startAngle = baseAngle - HALF_PI;
    
    const w0 = halfWidth + fringeW;
    const w1 = halfWidth;
    
    const centerIdx = canvas.vertexCount;
    
    // Center vertex
    canvas._addVertex(cx, cy, 0, color.r, color.g, color.b, color.a, 0, 0, -1.0, 0.0);
    
    // Inner arc vertices (solid)
    for (let i = 0; i <= segments; i++) {
        const angle = startAngle + i * angleStep;
        const x = cx + Math.cos(angle) * w1;
        const y = cy + Math.sin(angle) * w1;
        canvas._addVertex(x, y, 0, color.r, color.g, color.b, color.a, 0, 0, -1.0, 0.0);
    }
    
    if (useFringe) {
        // Outer arc vertices (fringe - transparent)
        for (let i = 0; i <= segments; i++) {
            const angle = startAngle + i * angleStep;
            const x = cx + Math.cos(angle) * w0;
            const y = cy + Math.sin(angle) * w0;
            canvas._addVertex(x, y, 0, color.r, color.g, color.b, 0, 0, 0, -1.0, 1.0);
        }
    }
    
    // Triangles for fill (fan from center)
    for (let i = 0; i < segments; i++) {
        canvas.indices.push(centerIdx, centerIdx + 1 + i, centerIdx + 1 + i + 1);
    }
    
    if (useFringe) {
        // Triangles for fringe
        for (let i = 0; i < segments; i++) {
            const i0 = centerIdx + 1 + i;
            const i1 = centerIdx + 1 + i + 1;
            const i2 = centerIdx + 1 + segments + 1 + i;
            const i3 = centerIdx + 1 + segments + 1 + i + 1;
            canvas.indices.push(i0, i2, i1);
            canvas.indices.push(i1, i2, i3);
        }
    }
}

// Render end fringe for square cap
function renderSquareCapFringe(canvas, cx, cy, dirX, dirY, normX, normY, halfWidth, fringeW, color) {
    const w0 = halfWidth + fringeW;
    const w1 = halfWidth;
    
    const startIdx = canvas.vertexCount;
    
    // The end point of the fringe
    const endX = cx + dirX * fringeW;
    const endY = cy + dirY * fringeW;
    
    // 4 vertices for the end fringe quad
    // At cap edge (solid)
    canvas._addVertex(cx + normX * w1, cy + normY * w1, 0, color.r, color.g, color.b, color.a, 0, 0, -1.0, 0.0);
    canvas._addVertex(cx - normX * w1, cy - normY * w1, 0, color.r, color.g, color.b, color.a, 0, 0, -1.0, 0.0);
    // At fringe edge (transparent)
    canvas._addVertex(endX + normX * w1, endY + normY * w1, 0, color.r, color.g, color.b, 0, 0, 0, -1.0, 1.0);
    canvas._addVertex(endX - normX * w1, endY - normY * w1, 0, color.r, color.g, color.b, 0, 0, 0, -1.0, 1.0);
    
    // Corner fringe vertices (outer corners)
    canvas._addVertex(cx + normX * w0, cy + normY * w0, 0, color.r, color.g, color.b, 0, 0, 0, -1.0, 1.0);
    canvas._addVertex(cx - normX * w0, cy - normY * w0, 0, color.r, color.g, color.b, 0, 0, 0, -1.0, 1.0);
    canvas._addVertex(endX + normX * w0, endY + normY * w0, 0, color.r, color.g, color.b, 0, 0, 0, -1.0, 1.0);
    canvas._addVertex(endX - normX * w0, endY - normY * w0, 0, color.r, color.g, color.b, 0, 0, 0, -1.0, 1.0);
    
    // End fringe quad (center)
    canvas.indices.push(startIdx+0, startIdx+2, startIdx+1);
    canvas.indices.push(startIdx+1, startIdx+2, startIdx+3);
    
    // Side fringes
    canvas.indices.push(startIdx+0, startIdx+4, startIdx+2);
    canvas.indices.push(startIdx+2, startIdx+4, startIdx+6);
    canvas.indices.push(startIdx+1, startIdx+3, startIdx+5);
    canvas.indices.push(startIdx+3, startIdx+7, startIdx+5);
    
    // Corner triangles
    canvas.indices.push(startIdx+2, startIdx+6, startIdx+3);
    canvas.indices.push(startIdx+3, startIdx+6, startIdx+7);
}

function renderCircle(canvas, cx, cy, radius) {
    // Convert center to world coordinates
    const center = canvas._toWorld(cx, cy);
    
    // Radius, fringe, and stroke width in world units
    const r = canvas._pixelsToWorld(radius);
    const fringeW = canvas._pixelsToWorld(canvas.currentFringeWidth);
    const strokeW = canvas._pixelsToWorld(canvas._getScaledStrokeWidth());
    
    const useFringe = fringeW > 0;
    
    // Number of segments based on radius (in pixels for quality)
    const segments = Math.max(12, Math.min(64, Math.floor(radius)));
    const angleStep = TWO_PI / segments;
    
    const fillColor = canvas.doFill ? canvas.fillColor : new vec4(0, 0, 0, 0);
    const strokeColor = canvas.doStroke ? canvas.strokeColor : new vec4(0, 0, 0, 0);
    
    if (canvas.doFill) {
        const startIdx = canvas.vertexCount;
        
        // Center vertex
        canvas._addVertex(center.x, center.y, 0, fillColor.r, fillColor.g, fillColor.b, fillColor.a, 0, 0, -1.0, 0.0);
        
        // Inner edge vertices (solid)
        for (let i = 0; i <= segments; i++) {
            const angle = i * angleStep;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            canvas._addVertex(center.x + cos * r, center.y + sin * r, 0, fillColor.r, fillColor.g, fillColor.b, fillColor.a, 0, 0, -1.0, 0.0);
        }
        
        if (useFringe) {
            const rFringe = r + fringeW;
            for (let i = 0; i <= segments; i++) {
                const angle = i * angleStep;
                const cos = Math.cos(angle);
                const sin = Math.sin(angle);
                canvas._addVertex(center.x + cos * rFringe, center.y + sin * rFringe, 0, fillColor.r, fillColor.g, fillColor.b, 0, 0, 0, -1.0, 1.0);
            }
        }
        
        // Fill triangles
        for (let i = 0; i < segments; i++) {
            canvas.indices.push(startIdx, startIdx + 1 + i, startIdx + 1 + i + 1);
        }
        
        if (useFringe) {
            for (let i = 0; i < segments; i++) {
                const i0 = startIdx + 1 + i;
                const i1 = startIdx + 1 + i + 1;
                const i2 = startIdx + 1 + segments + 1 + i;
                const i3 = startIdx + 1 + segments + 1 + i + 1;
                canvas.indices.push(i0, i2, i1);
                canvas.indices.push(i1, i2, i3);
            }
        }
    }
    
    if (canvas.doStroke) {
        const startIdx = canvas.vertexCount;
        const halfStrokeW = strokeW / 2;
        const innerR = r - halfStrokeW;
        const outerR = r + halfStrokeW;
        
        if (useFringe) {
            const fringeR = outerR + fringeW;
            const innerFringeR = innerR - fringeW;
            
            // 4 rings of vertices
            for (let i = 0; i <= segments; i++) {
                const angle = i * angleStep;
                const cos = Math.cos(angle);
                const sin = Math.sin(angle);
                canvas._addVertex(center.x + cos * innerFringeR, center.y + sin * innerFringeR, 0, strokeColor.r, strokeColor.g, strokeColor.b, 0, 0, 0, -1.0, 1.0);
            }
            for (let i = 0; i <= segments; i++) {
                const angle = i * angleStep;
                const cos = Math.cos(angle);
                const sin = Math.sin(angle);
                canvas._addVertex(center.x + cos * innerR, center.y + sin * innerR, 0, strokeColor.r, strokeColor.g, strokeColor.b, strokeColor.a, 0, 0, -1.0, 0.0);
            }
            for (let i = 0; i <= segments; i++) {
                const angle = i * angleStep;
                const cos = Math.cos(angle);
                const sin = Math.sin(angle);
                canvas._addVertex(center.x + cos * outerR, center.y + sin * outerR, 0, strokeColor.r, strokeColor.g, strokeColor.b, strokeColor.a, 0, 0, -1.0, 0.0);
            }
            for (let i = 0; i <= segments; i++) {
                const angle = i * angleStep;
                const cos = Math.cos(angle);
                const sin = Math.sin(angle);
                canvas._addVertex(center.x + cos * fringeR, center.y + sin * fringeR, 0, strokeColor.r, strokeColor.g, strokeColor.b, 0, 0, 0, -1.0, 1.0);
            }
            
            // 3 quad strips
            for (let i = 0; i < segments; i++) {
                // Inner fringe
                const i0 = startIdx + i;
                const i1 = startIdx + i + 1;
                const i2 = startIdx + segments + 1 + i;
                const i3 = startIdx + segments + 1 + i + 1;
                canvas.indices.push(i0, i2, i1);
                canvas.indices.push(i1, i2, i3);
                
                // Solid stroke
                const s0 = startIdx + segments + 1 + i;
                const s1 = startIdx + segments + 1 + i + 1;
                const s2 = startIdx + (segments + 1) * 2 + i;
                const s3 = startIdx + (segments + 1) * 2 + i + 1;
                canvas.indices.push(s0, s2, s1);
                canvas.indices.push(s1, s2, s3);
                
                // Outer fringe
                const o0 = startIdx + (segments + 1) * 2 + i;
                const o1 = startIdx + (segments + 1) * 2 + i + 1;
                const o2 = startIdx + (segments + 1) * 3 + i;
                const o3 = startIdx + (segments + 1) * 3 + i + 1;
                canvas.indices.push(o0, o2, o1);
                canvas.indices.push(o1, o2, o3);
            }
        } else {
            // No fringe - 2 rings
            for (let i = 0; i <= segments; i++) {
                const angle = i * angleStep;
                const cos = Math.cos(angle);
                const sin = Math.sin(angle);
                canvas._addVertex(center.x + cos * innerR, center.y + sin * innerR, 0, strokeColor.r, strokeColor.g, strokeColor.b, strokeColor.a, 0, 0, -1.0, 0.0);
            }
            for (let i = 0; i <= segments; i++) {
                const angle = i * angleStep;
                const cos = Math.cos(angle);
                const sin = Math.sin(angle);
                canvas._addVertex(center.x + cos * outerR, center.y + sin * outerR, 0, strokeColor.r, strokeColor.g, strokeColor.b, strokeColor.a, 0, 0, -1.0, 0.0);
            }
            
            for (let i = 0; i < segments; i++) {
                const i0 = startIdx + i;
                const i1 = startIdx + i + 1;
                const i2 = startIdx + segments + 1 + i;
                const i3 = startIdx + segments + 1 + i + 1;
                canvas.indices.push(i0, i2, i1);
                canvas.indices.push(i1, i2, i3);
            }
        }
    }
}

function renderEllipse(canvas, cx, cy, width, height) {
    const center = canvas._toWorld(cx, cy);
    
    const rx = canvas._pixelsToWorld(width / 2);
    const ry = canvas._pixelsToWorld(height / 2);
    const fringeW = canvas._pixelsToWorld(canvas.currentFringeWidth);
    const strokeW = canvas._pixelsToWorld(canvas._getScaledStrokeWidth());
    
    const useFringe = fringeW > 0;
    
    const maxRadius = Math.max(width, height) / 2;
    const segments = Math.max(12, Math.min(64, Math.floor(maxRadius)));
    const angleStep = TWO_PI / segments;
    
    const fillColor = canvas.doFill ? canvas.fillColor : new vec4(0, 0, 0, 0);
    const strokeColor = canvas.doStroke ? canvas.strokeColor : new vec4(0, 0, 0, 0);
    
    if (canvas.doFill) {
        const startIdx = canvas.vertexCount;
        
        canvas._addVertex(center.x, center.y, 0, fillColor.r, fillColor.g, fillColor.b, fillColor.a, 0, 0, -1.0, 0.0);
        
        for (let i = 0; i <= segments; i++) {
            const angle = i * angleStep;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            canvas._addVertex(center.x + cos * rx, center.y + sin * ry, 0, fillColor.r, fillColor.g, fillColor.b, fillColor.a, 0, 0, -1.0, 0.0);
        }
        
        if (useFringe) {
            for (let i = 0; i <= segments; i++) {
                const angle = i * angleStep;
                const cos = Math.cos(angle);
                const sin = Math.sin(angle);
                // Normal direction for ellipse
                const nx = cos / rx;
                const ny = sin / ry;
                const nVec = new vec2(nx, ny).normalize();
                const x = center.x + cos * rx + nVec.x * fringeW;
                const y = center.y + sin * ry + nVec.y * fringeW;
                canvas._addVertex(x, y, 0, fillColor.r, fillColor.g, fillColor.b, 0, 0, 0, -1.0, 1.0);
            }
        }
        
        for (let i = 0; i < segments; i++) {
            canvas.indices.push(startIdx, startIdx + 1 + i, startIdx + 1 + i + 1);
        }
        
        if (useFringe) {
            for (let i = 0; i < segments; i++) {
                const i0 = startIdx + 1 + i;
                const i1 = startIdx + 1 + i + 1;
                const i2 = startIdx + 1 + segments + 1 + i;
                const i3 = startIdx + 1 + segments + 1 + i + 1;
                canvas.indices.push(i0, i2, i1);
                canvas.indices.push(i1, i2, i3);
            }
        }
    }
    
    if (canvas.doStroke) {
        const startIdx = canvas.vertexCount;
        const halfStrokeW = strokeW / 2;
        
        if (useFringe) {
            // 4 rings
            for (let ring = 0; ring < 4; ring++) {
                for (let i = 0; i <= segments; i++) {
                    const angle = i * angleStep;
                    const cos = Math.cos(angle);
                    const sin = Math.sin(angle);
                    
                    const nx = cos / rx;
                    const ny = sin / ry;
                    const nVec = new vec2(nx, ny).normalize();
                    
                    let offset, alpha, edgeDist;
                    if (ring === 0) {
                        offset = -halfStrokeW - fringeW;
                        alpha = 0;
                        edgeDist = 1.0;
                    } else if (ring === 1) {
                        offset = -halfStrokeW;
                        alpha = strokeColor.a;
                        edgeDist = 0.0;
                    } else if (ring === 2) {
                        offset = halfStrokeW;
                        alpha = strokeColor.a;
                        edgeDist = 0.0;
                    } else {
                        offset = halfStrokeW + fringeW;
                        alpha = 0;
                        edgeDist = 1.0;
                    }
                    
                    const x = center.x + cos * rx + nVec.x * offset;
                    const y = center.y + sin * ry + nVec.y * offset;
                    canvas._addVertex(x, y, 0, strokeColor.r, strokeColor.g, strokeColor.b, alpha, 0, 0, -1.0, edgeDist);
                }
            }
            
            for (let strip = 0; strip < 3; strip++) {
                for (let i = 0; i < segments; i++) {
                    const i0 = startIdx + strip * (segments + 1) + i;
                    const i1 = startIdx + strip * (segments + 1) + i + 1;
                    const i2 = startIdx + (strip + 1) * (segments + 1) + i;
                    const i3 = startIdx + (strip + 1) * (segments + 1) + i + 1;
                    canvas.indices.push(i0, i2, i1);
                    canvas.indices.push(i1, i2, i3);
                }
            }
        } else {
            // 2 rings
            for (let ring = 0; ring < 2; ring++) {
                for (let i = 0; i <= segments; i++) {
                    const angle = i * angleStep;
                    const cos = Math.cos(angle);
                    const sin = Math.sin(angle);
                    
                    const nx = cos / rx;
                    const ny = sin / ry;
                    const nVec = new vec2(nx, ny).normalize();
                    
                    const offset = ring === 0 ? -halfStrokeW : halfStrokeW;
                    const x = center.x + cos * rx + nVec.x * offset;
                    const y = center.y + sin * ry + nVec.y * offset;
                    canvas._addVertex(x, y, 0, strokeColor.r, strokeColor.g, strokeColor.b, strokeColor.a, 0, 0, -1.0, 0.0);
                }
            }
            
            for (let i = 0; i < segments; i++) {
                const i0 = startIdx + i;
                const i1 = startIdx + i + 1;
                const i2 = startIdx + (segments + 1) + i;
                const i3 = startIdx + (segments + 1) + i + 1;
                canvas.indices.push(i0, i2, i1);
                canvas.indices.push(i1, i2, i3);
            }
        }
    }
}

function renderRect(canvas, x, y, w, h, r1, r2, r3, r4) {
    // Transform all 4 corners individually (like image() does) for proper alignment
    const tl = canvas._toWorld(x, y);
    const tr = canvas._toWorld(x + w, y);
    const bl = canvas._toWorld(x, y + h);
    const br = canvas._toWorld(x + w, y + h);
    
    // Calculate actual world space dimensions from transformed corners
    const sizeW = tr.x - tl.x;
    const sizeH = Math.abs(bl.y - tl.y);
    
    const fringeW = canvas._pixelsToWorld(canvas.currentFringeWidth);
    const strokeW = canvas._pixelsToWorld(canvas._getScaledStrokeWidth());
    
    const useFringe = fringeW > 0;
    
    // Clamp corner radii
    const maxR = Math.min(w, h) / 2;
    r1 = Math.min(r1, maxR);
    r2 = Math.min(r2, maxR);
    r3 = Math.min(r3, maxR);
    r4 = Math.min(r4, maxR);
    
    const wr1 = canvas._pixelsToWorld(r1);
    const wr2 = canvas._pixelsToWorld(r2);
    const wr3 = canvas._pixelsToWorld(r3);
    const wr4 = canvas._pixelsToWorld(r4);
    
    const fillColor = canvas.doFill ? canvas.fillColor : new vec4(0, 0, 0, 0);
    const strokeColor = canvas.doStroke ? canvas.strokeColor : new vec4(0, 0, 0, 0);
    
    // Corner centers and angles (now using transformed corners)
    const corners = [
        { cx: tl.x + wr1, cy: tl.y - wr1, r: wr1, startAngle: PI * 0.5, endAngle: PI },
        { cx: tl.x + sizeW - wr2, cy: tl.y - wr2, r: wr2, startAngle: 0, endAngle: PI * 0.5 },
        { cx: tl.x + sizeW - wr3, cy: tl.y - sizeH + wr3, r: wr3, startAngle: PI * 1.5, endAngle: TWO_PI },
        { cx: tl.x + wr4, cy: tl.y - sizeH + wr4, r: wr4, startAngle: PI, endAngle: PI * 1.5 }
    ];
    
    const segmentsPerCorner = 8;
    
    // Build path
    function buildPath() {
        const path = [];
        const edgeNormals = [
            [new vec2(-1, 0), new vec2(0, 1)],
            [new vec2(0, 1), new vec2(1, 0)],
            [new vec2(1, 0), new vec2(0, -1)],
            [new vec2(0, -1), new vec2(-1, 0)]
        ];
        
        for (let c = 0; c < 4; c++) {
            const corner = corners[c];
            if (corner.r > 0.001) {
                const angleRange = corner.endAngle - corner.startAngle;
                for (let i = 0; i <= segmentsPerCorner; i++) {
                    const t = i / segmentsPerCorner;
                    const angle = corner.endAngle - t * angleRange;
                    const cos = Math.cos(angle);
                    const sin = Math.sin(angle);
                    path.push({
                        x: corner.cx + cos * corner.r,
                        y: corner.cy + sin * corner.r,
                        nx: cos,
                        ny: sin
                    });
                }
            } else {
                path.push({ x: corner.cx, y: corner.cy, nx: edgeNormals[c][0].x, ny: edgeNormals[c][0].y });
                path.push({ x: corner.cx, y: corner.cy, nx: edgeNormals[c][1].x, ny: edgeNormals[c][1].y });
            }
        }
        path.push(path[0]);
        return path;
    }
    
    if (canvas.doFill) {
        const startIdx = canvas.vertexCount;
        const centerX = tl.x + sizeW / 2;
        const centerY = tl.y - sizeH / 2;
        canvas._addVertex(centerX, centerY, 0, fillColor.r, fillColor.g, fillColor.b, fillColor.a, 0, 0, -1.0, 0.0);
        
        const innerPath = buildPath();
        const pathLen = innerPath.length;
        
        for (const p of innerPath) {
            canvas._addVertex(p.x, p.y, 0, fillColor.r, fillColor.g, fillColor.b, fillColor.a, 0, 0, -1.0, 0.0);
        }
        
        if (useFringe) {
            for (const p of innerPath) {
                canvas._addVertex(p.x + p.nx * fringeW, p.y + p.ny * fringeW, 0, fillColor.r, fillColor.g, fillColor.b, 0, 0, 0, -1.0, 1.0);
            }
        }
        
        for (let i = 0; i < pathLen - 1; i++) {
            canvas.indices.push(startIdx, startIdx + 1 + i + 1, startIdx + 1 + i);
        }
        
        if (useFringe) {
            for (let i = 0; i < pathLen - 1; i++) {
                const i0 = startIdx + 1 + i;
                const i1 = startIdx + 1 + i + 1;
                const i2 = startIdx + 1 + pathLen + i;
                const i3 = startIdx + 1 + pathLen + i + 1;
                canvas.indices.push(i0, i1, i2);
                canvas.indices.push(i2, i1, i3);
            }
        }
    }
    
    if (canvas.doStroke) {
        const startIdx = canvas.vertexCount;
        const halfStrokeW = strokeW / 2;
        const path = buildPath();
        const pathLen = path.length;
        
        if (useFringe) {
            const offsets = [-halfStrokeW - fringeW, -halfStrokeW, halfStrokeW, halfStrokeW + fringeW];
            const alphas = [0, strokeColor.a, strokeColor.a, 0];
            const edgeDists = [1.0, 0.0, 0.0, 1.0];
            
            for (let ring = 0; ring < 4; ring++) {
                for (const p of path) {
                    canvas._addVertex(p.x + p.nx * offsets[ring], p.y + p.ny * offsets[ring], 0, strokeColor.r, strokeColor.g, strokeColor.b, alphas[ring], 0, 0, -1.0, edgeDists[ring]);
                }
            }
            
            for (let strip = 0; strip < 3; strip++) {
                for (let i = 0; i < pathLen - 1; i++) {
                    const i0 = startIdx + strip * pathLen + i;
                    const i1 = startIdx + strip * pathLen + i + 1;
                    const i2 = startIdx + (strip + 1) * pathLen + i;
                    const i3 = startIdx + (strip + 1) * pathLen + i + 1;
                    canvas.indices.push(i0, i1, i2);
                    canvas.indices.push(i2, i1, i3);
                }
            }
        } else {
            const offsets = [-halfStrokeW, halfStrokeW];
            
            for (let ring = 0; ring < 2; ring++) {
                for (const p of path) {
                    canvas._addVertex(p.x + p.nx * offsets[ring], p.y + p.ny * offsets[ring], 0, strokeColor.r, strokeColor.g, strokeColor.b, strokeColor.a, 0, 0, -1.0, 0.0);
                }
            }
            
            for (let i = 0; i < pathLen - 1; i++) {
                const i0 = startIdx + i;
                const i1 = startIdx + i + 1;
                const i2 = startIdx + pathLen + i;
                const i3 = startIdx + pathLen + i + 1;
                canvas.indices.push(i0, i1, i2);
                canvas.indices.push(i2, i1, i3);
            }
        }
    }
}

// Fast check if a polygon is convex
function isConvexPolygon(path) {
    if (path.length < 3) return true;
    
    let sign = 0;
    const n = path.length;
    
    for (let i = 0; i < n; i++) {
        const p1 = path[i];
        const p2 = path[(i + 1) % n];
        const p3 = path[(i + 2) % n];
        
        // Cross product
        const dx1 = p2.x - p1.x;
        const dy1 = p2.y - p1.y;
        const dx2 = p3.x - p2.x;
        const dy2 = p3.y - p2.y;
        const cross = dx1 * dy2 - dy1 * dx2;
        
        if (Math.abs(cross) > EPSILON) {
            if (sign === 0) {
                sign = cross > 0 ? 1 : -1;
            } else if ((cross > 0 ? 1 : -1) !== sign) {
                return false;
            }
        }
    }
    
    return true;
}

function renderShape(canvas, shapeVertices, close) {
    if (shapeVertices.length < 2) return;
    
    const fringeW = canvas._pixelsToWorld(canvas.currentFringeWidth);
    const strokeW = canvas._pixelsToWorld(canvas._getScaledStrokeWidth());
    const useFringe = fringeW > 0;
    
    const fillColor = canvas.doFill ? canvas.fillColor : new vec4(0, 0, 0, 0);
    const strokeColor = canvas.doStroke ? canvas.strokeColor : new vec4(0, 0, 0, 0);
    
    // Convert all vertices to world coordinates
    const worldVerts = shapeVertices.map(v => canvas._toWorld(v.x, v.y));
    
    // Detect winding order using signed area
    let signedArea = 0;
    for (let i = 0; i < worldVerts.length; i++) {
        const p1 = worldVerts[i];
        const p2 = worldVerts[(i + 1) % worldVerts.length];
        signedArea += (p2.x - p1.x) * (p2.y + p1.y);
    }
    const isClockwise = signedArea > 0;
    const normalDirection = isClockwise ? 1 : -1;
    
    // Build path with normals
    const path = [];
    const n = worldVerts.length;
    
    for (let i = 0; i < n; i++) {
        const curr = worldVerts[i];
        const prev = worldVerts[(i - 1 + n) % n];
        const next = worldVerts[(i + 1) % n];
        
        // Edge vectors using vec2
        const e1 = new vec2(curr.x - prev.x, curr.y - prev.y);
        const e2 = new vec2(next.x - curr.x, next.y - curr.y);
        
        // Normals
        const len1Sq = e1.lengthSquared;
        const len2Sq = e2.lengthSquared;
        
        let n1 = new vec2(0, 0);
        let n2 = new vec2(0, 0);
        
        if (len1Sq > EPSILON_SQ) {
            const len1 = Math.sqrt(len1Sq);
            n1 = new vec2(-e1.y / len1 * normalDirection, e1.x / len1 * normalDirection);
        }
        if (len2Sq > EPSILON_SQ) {
            const len2 = Math.sqrt(len2Sq);
            n2 = new vec2(-e2.y / len2 * normalDirection, e2.x / len2 * normalDirection);
        }
        
        // Join style handling
        let nx, ny, scale = 1.0;
        if (close || (i > 0 && i < n - 1)) {
            if (canvas.lineJoinStyle === JOIN_BEVEL) {
                path.push({ x: curr.x, y: curr.y, nx: n1.x, ny: n1.y, scale: 1.0, isBevel: true, isFirst: true });
                path.push({ x: curr.x, y: curr.y, nx: n2.x, ny: n2.y, scale: 1.0, isBevel: true, isFirst: false });
                continue;
            } else if (canvas.lineJoinStyle === JOIN_ROUND) {
                const angle1 = Math.atan2(n1.y, n1.x);
                const angle2 = Math.atan2(n2.y, n2.x);
                
                let angleDiff = angle2 - angle1;
                while (angleDiff > PI) angleDiff -= TWO_PI;
                while (angleDiff < -PI) angleDiff += TWO_PI;
                
                const segments = Math.max(2, Math.ceil(Math.abs(angleDiff) / (PI / 8)));
                
                for (let j = 0; j <= segments; j++) {
                    const t = j / segments;
                    const angle = angle1 + angleDiff * t;
                    path.push({ x: curr.x, y: curr.y, nx: Math.cos(angle), ny: Math.sin(angle), scale: 1.0, isRound: true });
                }
                continue;
            } else {
                // Miter join
                const combined = n1.add(n2);
                const nlen = combined.length;
                if (nlen > EPSILON) {
                    const normalized = combined.uniformScale(1 / nlen);
                    nx = normalized.x;
                    ny = normalized.y;
                    
                    const dot = nx * n1.x + ny * n1.y;
                    if (dot > EPSILON) {
                        scale = 1.0 / dot;
                    }
                } else {
                    nx = n1.x;
                    ny = n1.y;
                }
            }
        } else if (i === 0) {
            nx = n2.x;
            ny = n2.y;
        } else {
            nx = n1.x;
            ny = n1.y;
        }
        
        path.push({ x: curr.x, y: curr.y, nx: nx, ny: ny, scale: scale, isBevel: false });
    }
    
    // Fill the shape
    if (canvas.doFill && path.length >= 3) {
        const startIdx = canvas.vertexCount;
        const pathLen = path.length;
        
        const useTriangulation = !isConvexPolygon(worldVerts);
        
        if (useTriangulation) {
            for (const p of path) {
                canvas._addVertex(p.x, p.y, 0, fillColor.r, fillColor.g, fillColor.b, fillColor.a, 0, 0, -1.0, 0.0);
            }
            
            if (useFringe) {
                for (const p of path) {
                    canvas._addVertex(p.x + p.nx * fringeW, p.y + p.ny * fringeW, 0, fillColor.r, fillColor.g, fillColor.b, 0, 0, 0, -1.0, 1.0);
                }
            }
            
            const flatVertices = [];
            if (isClockwise) {
                for (let i = pathLen - 1; i >= 0; i--) {
                    flatVertices.push(path[i].x, path[i].y);
                }
            } else {
                for (const p of path) {
                    flatVertices.push(p.x, p.y);
                }
            }
            
            const triangleIndices = triangulate(flatVertices);
            
            if (isClockwise) {
                for (let i = 0; i < triangleIndices.length; i += 3) {
                    canvas.indices.push(
                        startIdx + (pathLen - 1 - triangleIndices[i]),
                        startIdx + (pathLen - 1 - triangleIndices[i + 1]),
                        startIdx + (pathLen - 1 - triangleIndices[i + 2])
                    );
                }
            } else {
                for (let i = 0; i < triangleIndices.length; i += 3) {
                    canvas.indices.push(
                        startIdx + triangleIndices[i],
                        startIdx + triangleIndices[i + 1],
                        startIdx + triangleIndices[i + 2]
                    );
                }
            }
            
            if (useFringe) {
                if (isClockwise) {
                    for (let i = 0; i < pathLen; i++) {
                        const i0 = startIdx + i;
                        const i1 = startIdx + ((i + 1) % pathLen);
                        const i2 = startIdx + pathLen + i;
                        const i3 = startIdx + pathLen + ((i + 1) % pathLen);
                        canvas.indices.push(i0, i1, i2);
                        canvas.indices.push(i2, i1, i3);
                    }
                } else {
                    for (let i = 0; i < pathLen; i++) {
                        const i0 = startIdx + i;
                        const i1 = startIdx + ((i + 1) % pathLen);
                        const i2 = startIdx + pathLen + i;
                        const i3 = startIdx + pathLen + ((i + 1) % pathLen);
                        canvas.indices.push(i0, i2, i1);
                        canvas.indices.push(i2, i3, i1);
                    }
                }
            }
        } else {
            // Triangle fan from centroid
            let cx = 0, cy = 0;
            for (const p of path) {
                cx += p.x;
                cy += p.y;
            }
            cx /= pathLen;
            cy /= pathLen;
            
            canvas._addVertex(cx, cy, 0, fillColor.r, fillColor.g, fillColor.b, fillColor.a, 0, 0, -1.0, 0.0);
            
            for (const p of path) {
                canvas._addVertex(p.x, p.y, 0, fillColor.r, fillColor.g, fillColor.b, fillColor.a, 0, 0, -1.0, 0.0);
            }
            canvas._addVertex(path[0].x, path[0].y, 0, fillColor.r, fillColor.g, fillColor.b, fillColor.a, 0, 0, -1.0, 0.0);
            
            if (useFringe) {
                for (const p of path) {
                    canvas._addVertex(p.x + p.nx * fringeW, p.y + p.ny * fringeW, 0, fillColor.r, fillColor.g, fillColor.b, 0, 0, 0, -1.0, 1.0);
                }
                canvas._addVertex(path[0].x + path[0].nx * fringeW, path[0].y + path[0].ny * fringeW, 0, fillColor.r, fillColor.g, fillColor.b, 0, 0, 0, -1.0, 1.0);
            }
            
            if (isClockwise) {
                for (let i = 0; i < pathLen; i++) {
                    canvas.indices.push(startIdx + 1 + i, startIdx, startIdx + 1 + ((i + 1) % pathLen));
                }
            } else {
                for (let i = 0; i < pathLen; i++) {
                    canvas.indices.push(startIdx, startIdx + 1 + i, startIdx + 1 + ((i + 1) % pathLen));
                }
            }
            
            if (useFringe) {
                if (isClockwise) {
                    for (let i = 0; i < pathLen; i++) {
                        const i0 = startIdx + 1 + i;
                        const i1 = startIdx + 1 + ((i + 1) % pathLen);
                        const i2 = startIdx + 1 + pathLen + 1 + i;
                        const i3 = startIdx + 1 + pathLen + 1 + ((i + 1) % pathLen);
                        canvas.indices.push(i0, i1, i2);
                        canvas.indices.push(i2, i1, i3);
                    }
                } else {
                    for (let i = 0; i < pathLen; i++) {
                        const i0 = startIdx + 1 + i;
                        const i1 = startIdx + 1 + ((i + 1) % pathLen);
                        const i2 = startIdx + 1 + pathLen + 1 + i;
                        const i3 = startIdx + 1 + pathLen + 1 + ((i + 1) % pathLen);
                        canvas.indices.push(i0, i2, i1);
                        canvas.indices.push(i2, i3, i1);
                    }
                }
            }
        }
    }
    
    // Stroke the shape
    if (canvas.doStroke && path.length >= 2) {
        const startIdx = canvas.vertexCount;
        const halfStrokeW = strokeW / 2;
        
        const strokePath = [...path];
        if (close) {
            strokePath.push(path[0]);
        }
        
        if (useFringe) {
            const offsets = [-halfStrokeW - fringeW, -halfStrokeW, halfStrokeW, halfStrokeW + fringeW];
            const alphas = [0, strokeColor.a, strokeColor.a, 0];
            const edgeDists = [1.0, 0.0, 0.0, 1.0];
            
            for (let ring = 0; ring < 4; ring++) {
                for (const p of strokePath) {
                    const scaledOffset = offsets[ring] * (p.scale || 1.0);
                    canvas._addVertex(p.x + p.nx * scaledOffset, p.y + p.ny * scaledOffset, 0, strokeColor.r, strokeColor.g, strokeColor.b, alphas[ring], 0, 0, -1.0, edgeDists[ring]);
                }
            }
            
            const pathLen = strokePath.length;
            
            if (isClockwise) {
                for (let strip = 0; strip < 3; strip++) {
                    for (let i = 0; i < pathLen - 1; i++) {
                        const i0 = startIdx + strip * pathLen + i;
                        const i1 = startIdx + strip * pathLen + i + 1;
                        const i2 = startIdx + (strip + 1) * pathLen + i;
                        const i3 = startIdx + (strip + 1) * pathLen + i + 1;
                        canvas.indices.push(i0, i1, i2);
                        canvas.indices.push(i2, i1, i3);
                    }
                }
            } else {
                for (let strip = 0; strip < 3; strip++) {
                    for (let i = 0; i < pathLen - 1; i++) {
                        const i0 = startIdx + strip * pathLen + i;
                        const i1 = startIdx + strip * pathLen + i + 1;
                        const i2 = startIdx + (strip + 1) * pathLen + i;
                        const i3 = startIdx + (strip + 1) * pathLen + i + 1;
                        canvas.indices.push(i0, i2, i1);
                        canvas.indices.push(i2, i3, i1);
                    }
                }
            }
        } else {
            const offsets = [-halfStrokeW, halfStrokeW];
            
            for (let ring = 0; ring < 2; ring++) {
                for (const p of strokePath) {
                    const scaledOffset = offsets[ring] * (p.scale || 1.0);
                    canvas._addVertex(p.x + p.nx * scaledOffset, p.y + p.ny * scaledOffset, 0, strokeColor.r, strokeColor.g, strokeColor.b, strokeColor.a, 0, 0, -1.0, 0.0);
                }
            }
            
            const pathLen = strokePath.length;
            
            if (isClockwise) {
                for (let i = 0; i < pathLen - 1; i++) {
                    const i0 = startIdx + i;
                    const i1 = startIdx + i + 1;
                    const i2 = startIdx + pathLen + i;
                    const i3 = startIdx + pathLen + i + 1;
                    canvas.indices.push(i0, i1, i2);
                    canvas.indices.push(i2, i1, i3);
                }
            } else {
                for (let i = 0; i < pathLen - 1; i++) {
                    const i0 = startIdx + i;
                    const i1 = startIdx + i + 1;
                    const i2 = startIdx + pathLen + i;
                    const i3 = startIdx + pathLen + i + 1;
                    canvas.indices.push(i0, i2, i1);
                    canvas.indices.push(i2, i3, i1);
                }
            }
        }
        
        // Add caps for open shapes
        if (!close && canvas.lineCapStyle === CAP_ROUND) {
            const first = path[0];
            const second = path[1];
            const last = path[path.length - 1];
            const secondLast = path[path.length - 2];
            
            // Start cap
            const startDir = new vec2(second.x - first.x, second.y - first.y);
            const startLen = startDir.length;
            if (startLen > EPSILON) {
                const dir = startDir.uniformScale(1 / startLen);
                renderRoundCap(canvas, first.x, first.y, dir.x, dir.y, halfStrokeW, fringeW, strokeColor, false, useFringe);
            }
            
            // End cap
            const endDir = new vec2(last.x - secondLast.x, last.y - secondLast.y);
            const endLen = endDir.length;
            if (endLen > EPSILON) {
                const dir = endDir.uniformScale(1 / endLen);
                renderRoundCap(canvas, last.x, last.y, dir.x, dir.y, halfStrokeW, fringeW, strokeColor, true, useFringe);
            }
        } else if (!close && canvas.lineCapStyle === CAP_SQUARE && useFringe) {
            const first = path[0];
            const second = path[1];
            const last = path[path.length - 1];
            const secondLast = path[path.length - 2];
            
            // Start cap
            const startDir = new vec2(second.x - first.x, second.y - first.y);
            const startLen = startDir.length;
            if (startLen > EPSILON) {
                const dir = startDir.uniformScale(1 / startLen);
                const norm = new vec2(-dir.y, dir.x);
                renderSquareCapFringe(canvas, first.x, first.y, -dir.x, -dir.y, norm.x, norm.y, halfStrokeW, fringeW, strokeColor);
            }
            
            // End cap
            const endDir = new vec2(last.x - secondLast.x, last.y - secondLast.y);
            const endLen = endDir.length;
            if (endLen > EPSILON) {
                const dir = endDir.uniformScale(1 / endLen);
                const norm = new vec2(-dir.y, dir.x);
                renderSquareCapFringe(canvas, last.x, last.y, dir.x, dir.y, norm.x, norm.y, halfStrokeW, fringeW, strokeColor);
            }
        }
    }
}

// ============================================================================
// Image Rendering Helper
// ============================================================================

/**
 * Renders an image quad with optional fringe anti-aliasing
 */
function renderImageQuad(canvas, tl, tr, bl, br, u0, u1, v0, v1, color, textureId) {
    const fringeW = canvas._pixelsToWorld(canvas.currentFringeWidth);
    const useFringe = fringeW > 0;
    
    const startIdx = canvas.vertexCount;
    
    if (useFringe) {
        // Calculate edge normals using vec2
        const topEdge = tr.sub(tl);
        const topLen = topEdge.length;
        const topNorm = topLen > 0 ? new vec2(-topEdge.y / topLen, topEdge.x / topLen) : new vec2(0, 0);
        
        const rightEdge = br.sub(tr);
        const rightLen = rightEdge.length;
        const rightNorm = rightLen > 0 ? new vec2(-rightEdge.y / rightLen, rightEdge.x / rightLen) : new vec2(0, 0);
        
        const bottomEdge = bl.sub(br);
        const bottomLen = bottomEdge.length;
        const bottomNorm = bottomLen > 0 ? new vec2(-bottomEdge.y / bottomLen, bottomEdge.x / bottomLen) : new vec2(0, 0);
        
        const leftEdge = tl.sub(bl);
        const leftLen = leftEdge.length;
        const leftNorm = leftLen > 0 ? new vec2(-leftEdge.y / leftLen, leftEdge.x / leftLen) : new vec2(0, 0);
        
        // Corner normals (averaged)
        const tlNorm = leftNorm.add(topNorm).normalize();
        const trNorm = topNorm.add(rightNorm).normalize();
        const blNorm = bottomNorm.add(leftNorm).normalize();
        const brNorm = rightNorm.add(bottomNorm).normalize();
        
        // Outer fringe vertices
        const tlOuter = tl.add(tlNorm.uniformScale(fringeW));
        const trOuter = tr.add(trNorm.uniformScale(fringeW));
        const blOuter = bl.add(blNorm.uniformScale(fringeW));
        const brOuter = br.add(brNorm.uniformScale(fringeW));
        
        canvas._addVertex(tlOuter.x, tlOuter.y, 0, color.r, color.g, color.b, 0, u0, v0, textureId, 1.0);
        canvas._addVertex(trOuter.x, trOuter.y, 0, color.r, color.g, color.b, 0, u1, v0, textureId, 1.0);
        canvas._addVertex(blOuter.x, blOuter.y, 0, color.r, color.g, color.b, 0, u0, v1, textureId, 1.0);
        canvas._addVertex(brOuter.x, brOuter.y, 0, color.r, color.g, color.b, 0, u1, v1, textureId, 1.0);
        
        // Inner solid vertices
        canvas._addVertex(tl.x, tl.y, 0, color.r, color.g, color.b, color.a, u0, v0, textureId, 0.0);
        canvas._addVertex(tr.x, tr.y, 0, color.r, color.g, color.b, color.a, u1, v0, textureId, 0.0);
        canvas._addVertex(bl.x, bl.y, 0, color.r, color.g, color.b, color.a, u0, v1, textureId, 0.0);
        canvas._addVertex(br.x, br.y, 0, color.r, color.g, color.b, color.a, u1, v1, textureId, 0.0);
        
        // Core triangles
        canvas.indices.push(startIdx + 4, startIdx + 6, startIdx + 5);
        canvas.indices.push(startIdx + 5, startIdx + 6, startIdx + 7);
        
        // Fringe triangles
        canvas.indices.push(startIdx + 0, startIdx + 4, startIdx + 1);
        canvas.indices.push(startIdx + 1, startIdx + 4, startIdx + 5);
        canvas.indices.push(startIdx + 6, startIdx + 2, startIdx + 7);
        canvas.indices.push(startIdx + 7, startIdx + 2, startIdx + 3);
        canvas.indices.push(startIdx + 0, startIdx + 2, startIdx + 4);
        canvas.indices.push(startIdx + 4, startIdx + 2, startIdx + 6);
        canvas.indices.push(startIdx + 5, startIdx + 7, startIdx + 1);
        canvas.indices.push(startIdx + 1, startIdx + 7, startIdx + 3);
    } else {
        canvas._addVertex(tl.x, tl.y, 0, color.r, color.g, color.b, color.a, u0, v0, textureId, 0.0);
        canvas._addVertex(tr.x, tr.y, 0, color.r, color.g, color.b, color.a, u1, v0, textureId, 0.0);
        canvas._addVertex(bl.x, bl.y, 0, color.r, color.g, color.b, color.a, u0, v1, textureId, 0.0);
        canvas._addVertex(br.x, br.y, 0, color.r, color.g, color.b, color.a, u1, v1, textureId, 0.0);
        
        canvas.indices.push(startIdx, startIdx + 2, startIdx + 1);
        canvas.indices.push(startIdx + 1, startIdx + 2, startIdx + 3);
    }
}

// Export rendering functions
module.exports = {
    // Constants
    CAP_ROUND,
    CAP_SQUARE,
    JOIN_MITER,
    JOIN_BEVEL,
    JOIN_ROUND,
    
    // Rendering functions
    renderLine,
    renderRoundCap,
    renderSquareCapFringe,
    renderCircle,
    renderEllipse,
    renderRect,
    renderShape,
    renderImageQuad
};
