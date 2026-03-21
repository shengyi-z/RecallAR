// CanvasAPI.js
//
// Procedural Vector Graphics API for Lens Studio

//@input Asset.Material vectorMaterial
//@input Asset.Material backgroundMaterial
//@input Asset.Material onscreenMaterial
//@input Asset.Texture overlayRT
//@input int baseRenderOrder = -3000

const scriptSo = script.getSceneObject();
const scriptLayer = scriptSo.layer;

const MAX_VERTICES_PER_BATCH = 60000; // Leave some margin

let manager;

// Import rendering functions
const {
    CAP_ROUND,
    CAP_SQUARE,
    JOIN_MITER,
    JOIN_BEVEL,
    JOIN_ROUND,
    renderLine,
    renderCircle,
    renderEllipse,
    renderRect,
    renderShape,
    renderImageQuad
} = require('./CanvasRenderer');
const { triangulate } = require('./Triangulator');

// Color mode constants
const RGB = 'rgb';
const HSB = 'hsb';
const HSL = 'hsl';

// Angle mode constants
const RADIANS = 'radians';
const DEGREES = 'degrees';

// Blend Modes
const NORMAL = 'normal';
const ADD = 'add';
const MULTIPLY = 'multiply';

// Image Modes
const CORNER = 'corner';
const CORNERS = 'corners';
const CENTER = 'center';

// Text Alignment - Horizontal
const LEFT = 'left';
const RIGHT = 'right';
const CENTER_ALIGN = 'center';

// Text Alignment - Vertical
const TOP = 'top';
const MIDDLE = 'middle';
const BOTTOM = 'bottom';

// Matrix helper functions using built-in mat3 class
function createTranslateMatrix(tx, ty) {
    const m = new mat3();
    m.column0 = new vec3(1, 0, 0);
    m.column1 = new vec3(0, 1, 0);
    m.column2 = new vec3(tx, ty, 1);
    return m;
}

function createScaleMatrix(sx, sy) {
    const m = new mat3();
    m.column0 = new vec3(sx, 0, 0);
    m.column1 = new vec3(0, sy, 0);
    m.column2 = new vec3(0, 0, 1);
    return m;
}

function createRotateMatrix(angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const m = new mat3();
    m.column0 = new vec3(c, s, 0);
    m.column1 = new vec3(-s, c, 0);
    m.column2 = new vec3(0, 0, 1);
    return m;
}

function transformPoint(mat, x, y) {
    // Apply 2D affine transform using mat3
    // mat3 is column-major: column0, column1, column2
    const col0 = mat.column0;
    const col1 = mat.column1;
    const col2 = mat.column2;
    
    return {
        x: col0.x * x + col1.x * y + col2.x,
        y: col0.y * x + col1.y * y + col2.y
    };
}

function getMatrixScale(mat) {
    // Extract scale from transform matrix using vec2 length
    const col0 = mat.column0;
    const col1 = mat.column1;
    const sx = new vec2(col0.x, col0.y).length;
    const sy = new vec2(col1.x, col1.y).length;
    return new vec2(sx, sy);
}

function isIdentityTransform(mat) {
    // Check if matrix is identity (no transforms applied)
    const col0 = mat.column0;
    const col1 = mat.column1;
    const col2 = mat.column2;
    
    return Math.abs(col0.x - 1) < 0.001 && Math.abs(col0.y) < 0.001 &&
           Math.abs(col1.x) < 0.001 && Math.abs(col1.y - 1) < 0.001 &&
           Math.abs(col2.x) < 0.001 && Math.abs(col2.y) < 0.001;
}

// Color conversion helpers
function hsbToRgb(h, s, b) {
    // h, s, b are all in range [0, 1]
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = b * (1 - s);
    const q = b * (1 - f * s);
    const t = b * (1 - (1 - f) * s);
    
    let r, g, b_out;
    switch (i % 6) {
        case 0: r = b; g = t; b_out = p; break;
        case 1: r = q; g = b; b_out = p; break;
        case 2: r = p; g = b; b_out = t; break;
        case 3: r = p; g = q; b_out = b; break;
        case 4: r = t; g = p; b_out = b; break;
        case 5: r = b; g = p; b_out = q; break;
    }
    
    return { r, g, b: b_out };
}

function hslToRgb(h, s, l) {
    // h, s, l are all in range [0, 1]
    let r, g, b;
    
    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    
    return { r, g, b };
}

function toLSBlendMode(mode) {
    switch(mode) {
        case ADD:
            return BlendMode.Add;
        case MULTIPLY:
            return BlendMode.Multiply;
        case NORMAL:
        default:
            return BlendMode.PremultipliedAlphaHardware;
    }
}

// Canvas for vector graphics using MeshBuilder
class Canvas {
    constructor(fullscreen, width, height) {
        this.size = new vec2(0,0);
        this.doStroke = true;
        this.strokeColor = new vec4(1,1,1,1);
        this.strokeWidth = 1;
        this.lineCapStyle = CAP_ROUND;
        this.lineJoinStyle = JOIN_MITER;
        this.doFill = true;
        this.fillColor = new vec4(1,1,1,1);
        this.firstFrame = true;
        
        // Color mode settings (default: RGB 0-255)
        this.currentColorMode = RGB;
        this.colorMaxValue = 255;

        // Blend mode settings (default NORMAL)
        this.currentBlendMode = NORMAL;
        this.lastBlendMode = NORMAL;
        
        // Transform settings
        this.currentAngleMode = DEGREES;
        this.transformMatrix = mat3.identity();
        this.matrixStack = [];
        
        // Current mesh building state
        this.vertices = [];
        this.indices = [];
        this.vertexCount = 0;
        this.currentVectorElement = null;
        
        // Element pooling (like Canvas.js)
        this.elements = {};        // Pool of unused elements by type
        this.activeElements = [];  // Elements used this frame
        this.lastElementType = null;
        
        // Anti-aliasing fringe width in pixels
        this.currentFringeWidth = 2.0;
        
        // Triangulation mode (true = proper triangulation for non-convex, false = triangle fan for convex only)
        this.useTriangulation = true;
        
        // Shape building state
        this.shapeVertices = null;
        this.lastShapeVertex = null;   // Last vertex added to shape (for bezierVertex)
        this.firstShapeVertex = null;  // First vertex (for closing bezier shapes)
        
        // Bezier curve detail (number of segments)
        this.bezierDetailValue = 20;
        
        // Multi-texture batching state
        this.maxTexturesPerBatch = 4;  // Conservative for mobile compatibility
        this.textureSlots = [];         // Array of textures in current batch
        this.textureIdMap = new Map();  // texture -> slot index mapping
        
        // Image mode settings (default CORNER)
        this.currentImageMode = CORNER;
        
        // Text settings
        this.currentTextSize = 20;
        this.currentTextAlignH = CENTER;
        this.currentTextAlignV = MIDDLE;
        
        this._init(fullscreen, Math.ceil(width), Math.ceil(height));
        this.background(200,200,200,0);
        
        this.lateUpdateEvt = script.createEvent("LateUpdateEvent");
        this.lateUpdateEvt.bind(() => {
            this._updateWorldCorners();
            script.removeEvent(this.lateUpdateEvt);
        });

        // Render accumulated geometry at end of frame
        this.updateEvt = script.createEvent("LateUpdateEvent");
        this.updateEvt.bind(() => {
            this._endFrame();
        });
    }

    /**
     * Gets/Sets this layer render order
    /* lower values render first
    */
    getRenderOrder(value) {
        return this.cameraComp.renderOrder-script.baseRenderOrder;
    }
    setRenderOrder(value) {
        this.cameraComp.renderOrder = script.baseRenderOrder+value;
    }

    /**
     * Destroys the canvas and cleans up all associated resources.
     * @example
     * const myCanvas = canvasMgr.createCanvas(500, 500);
     * // ... use canvas ...
     * myCanvas.destroy(); // Clean up when done
     */
    destroy() {
        manager.destroyCanvas(this);
    }

    /**
     * Sets the color mode for interpreting color values.
     * @param {string} mode - The color mode: RGB, HSB, or HSL
     * @param {number} [maxValue=255] - Maximum value for color components
     * @example
     * canvas.colorMode(canvas.RGB, 255);  // Default: RGB 0-255
     * canvas.colorMode(canvas.HSB, 360);  // HSB with hue 0-360
     * canvas.colorMode(canvas.HSL, 100);  // HSL with 0-100 range
     */
    colorMode(mode, maxValue) {
        this.currentColorMode = mode;
        this.colorMaxValue = maxValue !== undefined ? maxValue : 255;
    }

    /**
     * Sets the blend mode for drawing operations.
     * @param {string} mode - The blend mode: NORMAL, ADD, or MULTIPLY
     * @example
     * canvas.blendMode(canvas.NORMAL);    // Default blending
     * canvas.blendMode(canvas.ADD);       // Additive blending
     * canvas.blendMode(canvas.MULTIPLY);  // Multiply blending
     */
    blendMode(mode) {
        this.currentBlendMode = mode;
    }

    /**
     * Sets how images are positioned when drawn with image().
     * @param {string} mode - The image mode: CORNER, CENTER, or CORNERS
     * @example
     * canvas.imageMode(canvas.CORNER);  // x,y is top-left corner (default)
     * canvas.imageMode(canvas.CENTER);  // x,y is center point
     * canvas.imageMode(canvas.CORNERS); // x,y is top-left, w,h is bottom-right
     */
    imageMode(mode) {
        this.currentImageMode = mode;
    }

    /**
     * Sets the text size for subsequent text() calls.
     * @param {number} size - The text size in pixels
     * @example
     * canvas.textSize(24);
     * canvas.text("Hello", 100, 100); // Renders at size 24
     */
    textSize(size) {
        this.currentTextSize = size;
    }

    /**
     * Sets the text alignment for subsequent text() calls.
     * @param {string} horizAlign - Horizontal alignment: LEFT, CENTER, or RIGHT
     * @param {string} [vertAlign] - Vertical alignment: TOP, MIDDLE, or BOTTOM
     * @example
     * canvas.textAlign(canvas.CENTER, canvas.MIDDLE);
     * canvas.text("Centered", width/2, height/2);
     */
    textAlign(horizAlign, vertAlign) {
        if (horizAlign !== undefined) {
            this.currentTextAlignH = horizAlign;
        }
        if (vertAlign !== undefined) {
            this.currentTextAlignV = vertAlign;
        }
    }

    /**
     * Sets the stroke color for shapes and lines.
     * @param {number} r - Red component (or grayscale value)
     * @param {number} [g=r] - Green component
     * @param {number} [b=g] - Blue component
     * @param {number} [a=255] - Alpha (transparency)
     * @example
     * canvas.stroke(255);           // White stroke
     * canvas.stroke(255, 0, 0);     // Red stroke
     * canvas.stroke(0, 255, 0, 128); // Semi-transparent green
     */
    stroke(r,g=r,b=g,a=255) {
        this.strokeColor = this._convertColor(r, g, b, a);
        this.doStroke = true;
    }

    /**
     * Sets the stroke weight (line thickness) in pixels.
     * @param {number} weight - The stroke weight in pixels
     * @example
     * canvas.strokeWeight(1);  // Thin line (default)
     * canvas.strokeWeight(5);  // Thick line
     */
    strokeWeight(weight) {
        this.strokeWidth = weight;
    }

    /**
     * Sets the anti-aliasing fringe width in pixels.
     * @param {number} w - The fringe width in pixels
     * @example
     * canvas.fringeWidth(2.0);  // Default anti-aliasing
     * canvas.fringeWidth(0);    // Disable anti-aliasing
     */
    fringeWidth(w) {
        this.currentFringeWidth = w;
    }

    /**
     * Sets the line cap style for stroke endpoints.
     * @param {string} cap - The cap style: CAP_ROUND or CAP_SQUARE
     * @example
     * canvas.strokeCap(canvas.CAP_ROUND);  // Rounded ends
     * canvas.strokeCap(canvas.CAP_SQUARE); // Square ends
     */
    strokeCap(cap) {
        this.lineCapStyle = cap;
    }

    /**
     * Sets the line join style for stroke corners.
     * @param {string} join - The join style: JOIN_MITER, JOIN_BEVEL, or JOIN_ROUND
     * @example
     * canvas.strokeJoin(canvas.JOIN_MITER); // Sharp corners
     * canvas.strokeJoin(canvas.JOIN_ROUND); // Rounded corners
     */
    strokeJoin(join) {
        this.lineJoinStyle = join;
    }

    /**
     * Sets the fill color for shapes.
     * @param {number} r - Red component (or grayscale value)
     * @param {number} [g=r] - Green component
     * @param {number} [b=g] - Blue component
     * @param {number} [a=255] - Alpha (transparency)
     * @example
     * canvas.fill(255);           // White fill
     * canvas.fill(255, 0, 0);     // Red fill
     * canvas.fill(0, 255, 0, 128); // Semi-transparent green
     */
    fill(r,g=r,b=g,a=255) {
        this.fillColor = this._convertColor(r, g, b, a);
        this.doFill = true;
    }

    /**
     * Disables filling shapes (shapes will only have strokes).
     * @example
     * canvas.noFill();
     * canvas.circle(100, 100, 50); // Only outline, no fill
     */
    noFill() {
        this.doFill = false;
    }

    /**
     * Disables stroking shapes (shapes will only be filled).
     * @example
     * canvas.noStroke();
     * canvas.circle(100, 100, 50); // Only fill, no outline
     */
    noStroke() {
        this.doStroke = false;
    }

    /**
     * Creates a color value that can be used with fill() or stroke().
     * @param {number} r - Red component (or grayscale value)
     * @param {number} [g] - Green component
     * @param {number} [b] - Blue component
     * @param {number} [a] - Alpha (transparency)
     * @returns {vec4} Color as a vec4 (normalized 0-1)
     * @example
     * const myColor = canvas.color(255, 0, 0);
     * canvas.fill(myColor);
     */
    color(r, g, b, a) {
        // Return a normalized vec4 (0-1) for shader use
        return this._convertColor(r, g, b, a);
    }

    // Transform functions
    /**
     * Sets the angle mode for rotate() function.
     * @param {string} mode - The angle mode: DEGREES or RADIANS
     * @example
     * canvas.angleMode(canvas.DEGREES); // Default
     * canvas.rotate(90); // Rotate 90 degrees
     * 
     * canvas.angleMode(canvas.RADIANS);
     * canvas.rotate(Math.PI / 2); // Rotate π/2 radians
     */
    angleMode(mode) {
        this.currentAngleMode = mode;
    }

    /**
     * Translates (moves) the coordinate system.
     * @param {number} x - Horizontal translation in pixels
     * @param {number} y - Vertical translation in pixels
     * @example
     * canvas.translate(100, 50);
     * canvas.circle(0, 0, 25); // Circle appears at (100, 50)
     */
    translate(x, y) {
        this.transformMatrix = this.transformMatrix.mult(createTranslateMatrix(x, y));
    }

    /**
     * Scales the coordinate system.
     * @param {number} sx - Horizontal scale factor
     * @param {number} [sy=sx] - Vertical scale factor (defaults to sx for uniform scaling)
     * @example
     * canvas.scale(2);       // Double size (uniform)
     * canvas.scale(2, 0.5);  // Stretch horizontally, compress vertically
     */
    scale(sx, sy) {
        if (sy === undefined) sy = sx;
        this.transformMatrix = this.transformMatrix.mult(createScaleMatrix(sx, sy));
    }

    /**
     * Rotates the coordinate system.
     * @param {number} angle - Rotation angle (in degrees or radians depending on angleMode)
     * @example
     * canvas.angleMode(canvas.DEGREES);
     * canvas.rotate(45); // Rotate 45 degrees clockwise
     */
    rotate(angle) {
        // Convert to radians if in degrees mode
        const radians = this.currentAngleMode === DEGREES ? angle * Math.PI / 180 : angle;
        this.transformMatrix = this.transformMatrix.mult(createRotateMatrix(radians));
    }

    /**
     * Saves the current drawing settings and transformations.
     * Use with pop() to restore the state.
     * @example
     * canvas.push();
     * canvas.translate(100, 100);
     * canvas.rotate(45);
     * canvas.circle(0, 0, 25);
     * canvas.pop(); // Restore previous state
     */
    push() {
        // Push current transform matrix to stack by copying columns
        const copy = new mat3();
        copy.column0 = this.transformMatrix.column0;
        copy.column1 = this.transformMatrix.column1;
        copy.column2 = this.transformMatrix.column2;
        this.matrixStack.push(copy);
    }

    /**
     * Restores drawing settings and transformations saved with push().
     * @example
     * canvas.push();
     * canvas.rotate(45);
     * canvas.rect(0, 0, 50, 50);
     * canvas.pop(); // Back to previous rotation
     */
    pop() {
        // Pop matrix from stack
        if (this.matrixStack.length > 0) {
            this.transformMatrix = this.matrixStack.pop();
        } else {
            print("WARNING: pop() called with empty matrix stack");
        }
    }

    /**
     * Resets the transformation matrix to identity (no transformations).
     * @example
     * canvas.translate(100, 100);
     * canvas.rotate(45);
     * canvas.resetMatrix(); // Back to no transformations
     */
    resetMatrix() {
        this.transformMatrix = mat3.identity();
    }

    /**
     * Replaces the current transformation matrix with a custom matrix.
     * @param {mat3} matrix - A mat3 transformation matrix
     * @example
     * const customMatrix = mat3.identity();
     * canvas.applyMatrix(customMatrix);
     */
    applyMatrix(matrix) {
        // Replace current matrix with given mat3
        if (matrix instanceof mat3) {
            this.transformMatrix = matrix;
        } else {
            print("ERROR: applyMatrix requires a mat3 object");
        }
    }

    /**
     * Fills the canvas with a solid color.
     * @param {number} r - Red component (or grayscale value)
     * @param {number} [g=r] - Green component
     * @param {number} [b=g] - Blue component
     * @param {number} [a=255] - Alpha (transparency)
     * @example
     * canvas.background(255);           // White background
     * canvas.background(0, 0, 0);       // Black background
     * canvas.background(255, 0, 0, 128); // Semi-transparent red
     */
    background(r,g=r,b=g,a=255) {
        // Flush current vector if any
        this._flushCurrentVector();
        
        // Get or create background element
        const bg = this._getOrCreateElement("background");
        bg.imageComp.mainPass.baseColor = this._convertColor(r, g, b, a);
        bg.imageComp.mainPass.blendMode = BlendMode.Disabled;
        this.lastElementType = "background";
    }

    /**
     * Draws a line between two points.
     * @param {number} x1 - X coordinate of first point
     * @param {number} y1 - Y coordinate of first point
     * @param {number} x2 - X coordinate of second point
     * @param {number} y2 - Y coordinate of second point
     * @example
     * canvas.stroke(255);
     * canvas.strokeWeight(2);
     * canvas.line(0, 0, 100, 100); // Diagonal line
     */
    line(x1,y1,x2,y2) {
        this._ensureVectorElement();
        renderLine(this, x1, y1, x2, y2);
    }

    /**
     * Draws a point at the specified coordinates.
     * Uses the current stroke color and strokeWeight.
     * @param {number} x - X coordinate of the point
     * @param {number} y - Y coordinate of the point
     * @example
     * canvas.stroke(255, 0, 0);
     * canvas.strokeWeight(3);
     * canvas.point(100, 100); // Red point, 3 pixels wide
     */
    point(x, y) {
        if (!this.doStroke) {
            return;
        }

        const oldDoStroke = this.doStroke;
        const oldStroke = this.strokeColor;
        const oldDoFill = this.doFill;
        const oldFill = this.fillColor;
        const oldFringe = this.currentFringeWidth;
        const s = 2*this._getScaledStrokeWidth();
        this.doFill = true;
        this.fillColor = oldStroke;
        this.doStroke = false;
        this.currentFringeWidth = 0;
        // this.fill(oldStroke.r, oldStroke.g, oldStroke.b, oldStroke.a);
        // this.noStroke();
        this.circle(x, y, s);
        if (oldDoStroke) {
            this.stroke(oldStroke);
        }
        if (oldDoFill) {
            this.fill(oldFill.r, oldFill.g, oldFill.b, oldFill.a);
        }
        this.currentFringeWidth = oldFringe;
    }

    /**
     * Draws a circle.
     * @param {number} x - X coordinate of the center
     * @param {number} y - Y coordinate of the center
     * @param {number} d - Diameter of the circle
     * @example
     * canvas.fill(255, 0, 0);
     * canvas.circle(100, 100, 50); // Red circle, 50px diameter
     */
    circle(x, y, d) {
        this._ensureVectorElement();
        
        const radius = d / 2;
        
        // If transform is not identity, convert circle to ellipse/shape for proper transformation
        if (!isIdentityTransform(this.transformMatrix)) {
            // Draw circle as polygon (which will be transformed)
            const segments = Math.max(12, Math.min(64, Math.floor(d * 0.5)));
            this.beginShape();
            for (let i = 0; i < segments; i++) {
                const angle = (i / segments) * Math.PI * 2;
                const px = x + Math.cos(angle) * radius;
                const py = y + Math.sin(angle) * radius;
                this.vertex(px, py);
            }
            this.endShape(true);
        } else {
            renderCircle(this, x, y, radius);
        }
    }

    /**
     * Draws an ellipse.
     * @param {number} x - X coordinate of the center
     * @param {number} y - Y coordinate of the center
     * @param {number} w - Width of the ellipse
     * @param {number} h - Height of the ellipse
     * @example
     * canvas.fill(0, 255, 0);
     * canvas.ellipse(100, 100, 80, 50); // Green ellipse, 80px wide, 50px tall
     */
    ellipse(x, y, w, h) {
        this._ensureVectorElement();
        
        // If transform is not identity, convert ellipse to shape for proper transformation
        if (!isIdentityTransform(this.transformMatrix)) {
            const rx = w / 2;
            const ry = h / 2;
            const segments = Math.max(12, Math.min(64, Math.floor(Math.max(w, h) * 0.5)));
            
            this.beginShape();
            for (let i = 0; i < segments; i++) {
                const angle = (i / segments) * Math.PI * 2;
                const px = x + Math.cos(angle) * rx;
                const py = y + Math.sin(angle) * ry;
                this.vertex(px, py);
            }
            this.endShape(true);
        } else {
            renderEllipse(this, x, y, w, h);
        }
    }

    /**
     * Draws a rectangle with optional rounded corners.
     * @param {number} x - X coordinate of top-left corner
     * @param {number} y - Y coordinate of top-left corner
     * @param {number} w - Width of the rectangle
     * @param {number} h - Height of the rectangle
     * @param {number} [r1=0] - Radius of top-left corner
     * @param {number} [r2=r1] - Radius of top-right corner
     * @param {number} [r3=r2] - Radius of bottom-right corner
     * @param {number} [r4=r3] - Radius of bottom-left corner
     * @example
     * canvas.rect(10, 10, 100, 50);           // Simple rectangle
     * canvas.rect(10, 10, 100, 50, 10);       // All corners rounded
     * canvas.rect(10, 10, 100, 50, 10, 5, 0); // Different corner radii
     */
    rect(x, y, w, h, r1=0, r2=r1, r3=r2, r4=r3) {
        this._ensureVectorElement();
        
        // If transform is not identity, convert rect to shape for proper transformation
        if (!isIdentityTransform(this.transformMatrix)) {
            // Clamp corner radii
            const maxR = Math.min(w, h) / 2;
            r1 = Math.min(r1, maxR);
            r2 = Math.min(r2, maxR);
            r3 = Math.min(r3, maxR);
            r4 = Math.min(r4, maxR);
            
            this.beginShape();
            
            // Generate vertices for rounded rect
            const segmentsPerCorner = 8;
            
            // Top-left corner (r1)
            if (r1 > 0) {
                for (let i = 0; i <= segmentsPerCorner; i++) {
                    const angle = Math.PI + (Math.PI / 2) * (i / segmentsPerCorner);
                    const cx = x + r1;
                    const cy = y + r1;
                    this.vertex(cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1);
                }
            } else {
                this.vertex(x, y);
            }
            
            // Top-right corner (r2)
            if (r2 > 0) {
                for (let i = 0; i <= segmentsPerCorner; i++) {
                    const angle = Math.PI * 1.5 + (Math.PI / 2) * (i / segmentsPerCorner);
                    const cx = x + w - r2;
                    const cy = y + r2;
                    this.vertex(cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2);
                }
            } else {
                this.vertex(x + w, y);
            }
            
            // Bottom-right corner (r3)
            if (r3 > 0) {
                for (let i = 0; i <= segmentsPerCorner; i++) {
                    const angle = 0 + (Math.PI / 2) * (i / segmentsPerCorner);
                    const cx = x + w - r3;
                    const cy = y + h - r3;
                    this.vertex(cx + Math.cos(angle) * r3, cy + Math.sin(angle) * r3);
                }
            } else {
                this.vertex(x + w, y + h);
            }
            
            // Bottom-left corner (r4)
            if (r4 > 0) {
                for (let i = 0; i <= segmentsPerCorner; i++) {
                    const angle = Math.PI / 2 + (Math.PI / 2) * (i / segmentsPerCorner);
                    const cx = x + r4;
                    const cy = y + h - r4;
                    this.vertex(cx + Math.cos(angle) * r4, cy + Math.sin(angle) * r4);
                }
            } else {
                this.vertex(x, y + h);
            }
            
            this.endShape(true);
        } else {
            renderRect(this, x, y, w, h, r1, r2, r3, r4);
        }
    }

    /**
     * Begins recording vertices for a custom shape.
     * Use with vertex() or bezierVertex() and endShape().
     * @example
     * canvas.beginShape();
     * canvas.vertex(100, 100);
     * canvas.vertex(200, 150);
     * canvas.vertex(150, 250);
     * canvas.endShape(true); // Close the shape
     */
    beginShape() {
        this.shapeVertices = [];
        this.lastShapeVertex = null;
        this.firstShapeVertex = null;
    }

    /**
     * Finishes recording vertices and draws the custom shape.
     * @param {boolean} [close=false] - Whether to close the shape by connecting the last vertex to the first
     * @example
     * canvas.beginShape();
     * canvas.vertex(100, 100);
     * canvas.vertex(200, 100);
     * canvas.vertex(150, 200);
     * canvas.endShape(true); // Draw closed triangle
     */
    endShape(close = false) {
        if (!this.shapeVertices || this.shapeVertices.length < 2) {
            this.shapeVertices = null;
            this.lastShapeVertex = null;
            this.firstShapeVertex = null;
            return;
        }
        
        // If closing a bezier shape, draw the final curve from last to first
        if (close && this.lastShapeVertex && this.firstShapeVertex) {
            const x0 = this.lastShapeVertex.x;
            const y0 = this.lastShapeVertex.y;
            const cp0x = this.lastShapeVertex.cxOut !== undefined ? this.lastShapeVertex.cxOut : x0;
            const cp0y = this.lastShapeVertex.cyOut !== undefined ? this.lastShapeVertex.cyOut : y0;
            
            const cp1x = this.firstShapeVertex.cxIn !== undefined ? this.firstShapeVertex.cxIn : this.firstShapeVertex.x;
            const cp1y = this.firstShapeVertex.cyIn !== undefined ? this.firstShapeVertex.cyIn : this.firstShapeVertex.y;
            
            const x3 = this.firstShapeVertex.x;
            const y3 = this.firstShapeVertex.y;
            
            // Add the closing curve (excluding start, including end)
            for (let i = 1; i <= this.bezierDetailValue; i++) {
                const t = i / this.bezierDetailValue;
                const x = this._cubicBezier(x0, cp0x, cp1x, x3, t);
                const y = this._cubicBezier(y0, cp0y, cp1y, y3, t);
                this.shapeVertices.push({ x, y });
            }
        }
        
        this._ensureVectorElement();
        renderShape(this, this.shapeVertices, close);
        this.shapeVertices = null;
        this.lastShapeVertex = null;
        this.firstShapeVertex = null;
    }

    /**
     * Adds a vertex to the current shape being recorded.
     * Must be called between beginShape() and endShape().
     * @param {number} x - X coordinate of the vertex
     * @param {number} y - Y coordinate of the vertex
     * @example
     * canvas.beginShape();
     * canvas.vertex(100, 100);
     * canvas.vertex(200, 100);
     * canvas.vertex(150, 200);
     * canvas.endShape();
     */
    vertex(x, y) {
        if (this.shapeVertices) {
            this.shapeVertices.push({ x, y });
            // Store as lastShapeVertex without control points (they'll default to the vertex position)
            this.lastShapeVertex = { x, y };
        }
    }

    /**
     * Adds a bezier curve vertex to the current shape.
     * Must be called between beginShape() and endShape().
     * @param {number} incomingControlX - X coordinate of incoming control point
     * @param {number} incomingControlY - Y coordinate of incoming control point
     * @param {number} anchorX - X coordinate of anchor point
     * @param {number} anchorY - Y coordinate of anchor point
     * @param {number} outgoingControlX - X coordinate of outgoing control point
     * @param {number} outgoingControlY - Y coordinate of outgoing control point
     * @example
     * canvas.beginShape();
     * canvas.vertex(100, 100);
     * canvas.bezierVertex(150, 50, 200, 100, 250, 150);
     * canvas.endShape();
     */
    bezierVertex(incomingControlX, incomingControlY, anchorX, anchorY, outgoingControlX, outgoingControlY) {
        if (!this.shapeVertices) {
            print("ERROR: bezierVertex() must be called between beginShape() and endShape()");
            return;
        }
        
        // Get the last vertex as the start point for the curve
        const startVertex = this.lastShapeVertex || (this.shapeVertices.length > 0 ? this.shapeVertices[this.shapeVertices.length - 1] : null);
        
        if (startVertex) {
            // We have a previous vertex - draw a bezier curve from it to this new anchor
            const x0 = startVertex.x;
            const y0 = startVertex.y;
            
            // Control point from previous vertex (outgoing)
            const cp0x = startVertex.cxOut !== undefined ? startVertex.cxOut : x0;
            const cp0y = startVertex.cyOut !== undefined ? startVertex.cyOut : y0;
            
            // Control point for incoming to new anchor
            const cp1x = incomingControlX;
            const cp1y = incomingControlY;
            
            // New anchor point
            const x3 = anchorX;
            const y3 = anchorY;
            
            // Add intermediate points along the bezier curve (excluding start, including end)
            for (let i = 1; i <= this.bezierDetailValue; i++) {
                const t = i / this.bezierDetailValue;
                const x = this._cubicBezier(x0, cp0x, cp1x, x3, t);
                const y = this._cubicBezier(y0, cp0y, cp1y, y3, t);
                this.shapeVertices.push({ x, y });
            }
        } else {
            // First bezierVertex - just add the anchor point as the start
            this.shapeVertices.push({ x: anchorX, y: anchorY });
            // Store first vertex with its incoming control for closing the shape
            this.firstShapeVertex = {
                x: anchorX,
                y: anchorY,
                cxIn: incomingControlX,
                cyIn: incomingControlY
            };
        }
        
        // Store this anchor with its outgoing control point for the next curve
        this.lastShapeVertex = { 
            x: anchorX, 
            y: anchorY, 
            cxOut: outgoingControlX, 
            cyOut: outgoingControlY 
        };
    }

    /**
     * Sets the resolution for bezier curve rendering.
     * @param {number} detail - Number of line segments to use (higher = smoother curves)
     * @example
     * canvas.bezierDetail(20); // Default: smooth curves
     * canvas.bezierDetail(5);  // Lower detail: angular curves
     */
    bezierDetail(detail) {
        this.bezierDetailValue = Math.max(1, detail);
    }

    /**
     * Draws a cubic bezier curve.
     * @param {number} x1 - X coordinate of start point
     * @param {number} y1 - Y coordinate of start point
     * @param {number} cx1 - X coordinate of first control point
     * @param {number} cy1 - Y coordinate of first control point
     * @param {number} cx2 - X coordinate of second control point
     * @param {number} cy2 - Y coordinate of second control point
     * @param {number} x2 - X coordinate of end point
     * @param {number} y2 - Y coordinate of end point
     * @example
     * canvas.noFill();
     * canvas.stroke(255);
     * canvas.bezier(50, 100, 100, 50, 200, 150, 250, 100);
     */
    bezier(x1, y1, cx1, cy1, cx2, cy2, x2, y2) {
        this._ensureVectorElement();
        
        // Create a temporary shape with bezier curve points
        const points = [];
        for (let i = 0; i <= this.bezierDetailValue; i++) {
            const t = i / this.bezierDetailValue;
            const x = this._cubicBezier(x1, cx1, cx2, x2, t);
            const y = this._cubicBezier(y1, cy1, cy2, y2, t);
            points.push({ x, y });
        }
        
        // Render as a line (open shape)
        renderShape(this, points, false);
    }

    /**
     * Gets the render target texture of this canvas.
     * Use this to display the canvas on a sprite or image component.
     * @returns {Asset.Texture} The canvas texture
     * @example
     * const canvas = canvasMgr.createCanvas(500, 500);
     * canvas.rect(0, 0, 100, 100);
     * sprite.texture = canvas.getTexture();
     */
    getTexture() {
        return this.texture;
    }

    /**
     * Gets the size of the canvas in pixels.
     * @returns {vec2} Canvas size as vec2(width, height)
     * @example
     * const size = canvas.getSize();
     * print("Canvas: " + size.x + "x" + size.y);
     */
    getSize() {
        return this.size;
    }

    /**
     * Gets the width of the canvas in pixels.
     * @returns {number} Canvas width
     * @example
     * const width = canvas.getWidth();
     * canvas.line(0, 100, width, 100); // Horizontal line across canvas
     */
    getWidth() {
        return this.getSize().x;
    }

    /**
     * Gets the height of the canvas in pixels.
     * @returns {number} Canvas height
     * @example
     * const height = canvas.getHeight();
     * canvas.line(100, 0, 100, height); // Vertical line across canvas
     */
    getHeight() {
        return this.getSize().y;
    }

    // Image rendering with multi-texture batching
    /**
     * Draws an image/texture on the canvas.
     * @param {Asset.Texture} texture - The texture to draw
     * @param {number} x - X coordinate (meaning depends on imageMode)
     * @param {number} y - Y coordinate (meaning depends on imageMode)
     * @param {number} [w] - Width to draw (defaults to texture width)
     * @param {number} [h] - Height to draw (defaults to texture height)
     * @param {number} [sx=0] - Source X coordinate in texture
     * @param {number} [sy=0] - Source Y coordinate in texture
     * @param {number} [sWidth] - Source width (defaults to texture width)
     * @param {number} [sHeight] - Source height (defaults to texture height)
     * @example
     * // Draw entire texture
     * canvas.image(myTexture, 0, 0);
     * 
     * // Draw texture scaled to specific size
     * canvas.image(myTexture, 0, 0, 200, 100);
     * 
     * // Draw portion of texture (sprite sheet)
     * canvas.image(myTexture, 0, 0, 50, 50, 100, 100, 50, 50);
     */
    image(texture, x, y, w, h, sx, sy, sWidth, sHeight) {
        if (!texture) {
            print("image called with a missing texture");
            return;
        }
        // Handle optional parameters
        if (sx === undefined) {
            sx = 0;
            sy = 0;
            sWidth = texture.getWidth();
            sHeight = texture.getHeight();
        }
        if (w === undefined) {
            w = texture.getWidth();
            h = texture.getHeight();
        }
               
        // Get texture slot (may flush if batch is full)
        const textureId = this._getTextureSlot(texture);
        
        // Ensure we have a vector element
        this._ensureVectorElement();

        // Calculate UV coordinates for source rectangle
        const texWidth = texture.getWidth();
        const texHeight = texture.getHeight();
        const u0 = sx / texWidth;
        const u1 = (sx + sWidth) / texWidth;
        const v1 = (texHeight - (sy + sHeight)) / texHeight;
        const v0 = (texHeight - sy) / texHeight;
        
        // Adjust x, y, w, h based on image mode
        let drawX = x;
        let drawY = y;
        let drawW = w;
        let drawH = h;
        
        if (this.currentImageMode === CENTER) {
            // x,y is the center - calculate top-left corner
            drawX = x - w / 2;
            drawY = y - h / 2;
        } else if (this.currentImageMode === CORNERS) {
            // x,y is top-left, w,h is bottom-right position - calculate size
            drawW = w - x;
            drawH = h - y;
        }
        // CORNER mode: use as-is (x,y is top-left, w,h is size)
        
        // Transform corners to world space
        const tl = this._toWorld(drawX, drawY);
        const tr = this._toWorld(drawX + drawW, drawY);
        const bl = this._toWorld(drawX, drawY + drawH);
        const br = this._toWorld(drawX + drawW, drawY + drawH);
        
        // Color/tint (use fill color if set)
        const color = this.doFill ? this.fillColor : new vec4(1, 1, 1, 1);
        
        // Use the optimized renderImageQuad function from CanvasRenderer
        renderImageQuad(this, tl, tr, bl, br, u0, u1, v0, v1, color, textureId);
    }

    // Text rendering using Lens Studio Text component
    /**
     * Draws text on the canvas.
     * @param {string|number} str - The text to display (will be converted to string)
     * @param {number} x - X coordinate (meaning depends on textAlign)
     * @param {number} y - Y coordinate (meaning depends on textAlign)
     * @example
     * canvas.textSize(24);
     * canvas.textAlign(canvas.CENTER, canvas.MIDDLE);
     * canvas.fill(255);
     * canvas.text("Hello World", width/2, height/2);
     * 
     * // Draw number
     * canvas.text(score, 10, 10);
     */
    text(str, x, y) {
        if (str === undefined || str === null) {
            return;
        }
        
        // Convert to string if not already
        str = String(str);
        
        // Flush current vector rendering
        this._flushCurrentVector();
        
        // Get or create text element
        const textElement = this._getOrCreateElement("text");
        
        // Set text content
        textElement.textComp.text = str;
        
        // Set text size
        textElement.textComp.size = this._pixelsToWorld(this.currentTextSize)*20;
        // zero layout rect
        textElement.textComp.worldSpaceRect.setCenter(new vec2(0,0));
        textElement.textComp.worldSpaceRect.setSize(new vec2(0,0));
        
        // Map alignment constants to Lens Studio alignment
        const hAlignMap = {
            [LEFT]: HorizontalAlignment.Left,
            [CENTER_ALIGN]: HorizontalAlignment.Center,
            [RIGHT]: HorizontalAlignment.Right
        };
        const vAlignMap = {
            [TOP]: VerticalAlignment.Top,
            [MIDDLE]: VerticalAlignment.Center,
            [BOTTOM]: VerticalAlignment.Bottom
        };
        
        textElement.textComp.horizontalAlignment = hAlignMap[this.currentTextAlignH] || HorizontalAlignment.Left;
        textElement.textComp.verticalAlignment = vAlignMap[this.currentTextAlignV] || VerticalAlignment.Bottom;
        
        // Set colors
        if (this.doFill) {
            textElement.textComp.textFill.color = this.fillColor;
            textElement.textComp.textFill.enabled = true;
        } else {
            textElement.textComp.textFill.enabled = false;
        }
        
        if (this.doStroke) {
            textElement.textComp.outlineSettings.enabled = true;
            textElement.textComp.outlineSettings.fill.color = this.strokeColor;
            // Scale outline size with text size
            textElement.textComp.outlineSettings.size = Math.max(0.01, this.strokeWidth / this.currentTextSize);
        } else {
            textElement.textComp.outlineSettings.enabled = false;
        }
        
        // Convert screen position to world position
        const worldPos = this._toWorld(x, y);
        
        // Apply position and transform to the text scene object
        const transform = textElement.so.getTransform();
        transform.setLocalPosition(new vec3(worldPos.x, worldPos.y, 0));
        
        // Extract rotation and scale from transform matrix
        const fixedScale = 3;   // scale up text size
        const scale = getMatrixScale(this.transformMatrix);
        transform.setLocalScale(new vec3(fixedScale*scale.x, fixedScale*scale.y, 1));
        
        // Extract rotation from transform matrix
        const col0 = this.transformMatrix.column0;
        const col1 = this.transformMatrix.column1;
        const rotation = -Math.atan2(col0.y, col0.x);
        transform.setLocalRotation(quat.fromEulerAngles(0, 0, rotation));
        
        this.lastElementType = "text";
    }

    _convertColor(v1, v2, v3, a) {
        const alpha = (a === undefined) ? 1 : a / this.colorMaxValue;

        // Normalize input values based on maxValue
        const c1 = v1 / this.colorMaxValue;
        const c2 = v2 / this.colorMaxValue;
        const c3 = v3 / this.colorMaxValue;
        
        let r, g, b;
        
        if (this.currentColorMode === HSB) {
            // HSB mode: c1=hue, c2=saturation, c3=brightness
            const rgb = hsbToRgb(c1, c2, c3);
            r = rgb.r;
            g = rgb.g;
            b = rgb.b;
        } else if (this.currentColorMode === HSL) {
            // HSL mode: c1=hue, c2=saturation, c3=lightness
            const rgb = hslToRgb(c1, c2, c3);
            r = rgb.r;
            g = rgb.g;
            b = rgb.b;
        } else {
            // RGB mode (default)
            r = c1;
            g = c2;
            b = c3;
        }
        
        return new vec4(r, g, b, alpha);
    }

    _cubicBezier(p0, p1, p2, p3, t) {
        // Cubic Bezier formula: B(t) = (1-t)³P0 + 3(1-t)²tP1 + 3(1-t)t²P2 + t³P3
        const mt = 1 - t;
        const mt2 = mt * mt;
        const mt3 = mt2 * mt;
        const t2 = t * t;
        const t3 = t2 * t;
        
        return mt3 * p0 + 3 * mt2 * t * p1 + 3 * mt * t2 * p2 + t3 * p3;
    }

    // Get or allocate a texture slot in current batch
    _getTextureSlot(texture) {
        // Check if texture is already in batch
        if (this.textureIdMap.has(texture)) {
            return this.textureIdMap.get(texture);
        }
        
        // Check if we have room for another texture
        if (this.textureSlots.length >= this.maxTexturesPerBatch) {
            // Batch is full - flush and start new batch
            this._flushCurrentVector();
            this.currentVectorElement = null;
            this.lastElementType = null;    
        }
        
        // Add texture to batch
        const slotIndex = this.textureSlots.length;
        this.textureSlots.push(texture);
        this.textureIdMap.set(texture, slotIndex);
        
        return slotIndex;
    }

    _addVertex(x, y, z, r, g, b, a, u, v, textureId, edgeDist) {
        // Vertex format: position(3) + color(4) + uv(2) + textureId(1) + edgeDistance(1) = 11 components
        this.vertices.push(x, y, z, r, g, b, a, u, v, textureId, edgeDist);
        this.vertexCount++;
    }

    _toWorld(x, y) {
        // Apply transformation matrix first (in pixel space)
        const transformed = transformPoint(this.transformMatrix, x, y);
        
        // Convert screen coordinates (0,0 top-left to width,height bottom-right) to world coordinates
        const canvasSize = this.getSize();
        const tx = transformed.x / canvasSize.x;  // 0 to 1
        const ty = transformed.y / canvasSize.y;  // 0 to 1
        
        return new vec2(
            this.worldTL.x + tx * (this.worldTR.x - this.worldTL.x),
            this.worldTL.y + ty * (this.worldBL.y - this.worldTL.y)
        );
    }

    _pixelsToWorld(pixels) {
        // Convert pixel distance to world units
        return pixels / this.pixelSize;
    }

    _getScaledStrokeWidth() {
        // Get stroke width scaled by transform
        const scale = getMatrixScale(this.transformMatrix);
        // Use average of x and y scale
        const avgScale = (scale.x + scale.y) / 2;
        return this.strokeWidth * avgScale;
    }

    // Get or create an element from the pool
    _getOrCreateElement(type) {
        let element;
        
        if (this.elements[type] && this.elements[type].length > 0) {
            // Reuse from pool
            element = this.elements[type].pop();
            element.so.setParent(this.rootSo);
            element.so.enabled = true;
        } else {
            // Create new element
            element = this._createElement(type);
        }
        element.frameCount=1;

        // Make sure elements are rendered from first to last
        if (element.imageComp) {
            element.imageComp.renderOrder = this.activeElements.length;
        } else if (element.textComp) {
            element.textComp.renderOrder = this.activeElements.length;
        } else if (element.meshVisual) {
            element.meshVisual.renderOrder = this.activeElements.length;
        }
    
        this.activeElements.push(element);
        return element;
    }

    // Create a new element of the given type
    _createElement(type) {
        const so = global.scene.createSceneObject("Canvas " + type);
        so.setParent(this.rootSo);
        so.layer = this.rootSo.layer;
        
        const element = { so: so, type: type };
        
        if (type === "background") {
            so.createComponent("Component.ScreenTransform");
            const img = so.createComponent("Component.Image");
            img.clearMaterials();
            img.addMaterial(script.backgroundMaterial.clone());
            element.imageComp = img;
        } else if (type === "vector") {
            // Create MeshBuilder for this vector element with texture support
            const meshBuilder = new MeshBuilder([
                { name: "position", components: 3 },
                { name: "color", components: 4 },
                { name: "texture0", components: 2 },   // UV coordinates
                { name: "textureId", components: 1 },  // Texture slot index
                { name: "edgeDist", components: 1 }
            ]);
            meshBuilder.topology = MeshTopology.Triangles;
            meshBuilder.indexType = MeshIndexType.UInt16;
            
            const meshVisual = so.createComponent("Component.RenderMeshVisual");
            meshVisual.mainMaterial = script.vectorMaterial.clone();
            meshBuilder.updateMesh();
            meshVisual.mesh = meshBuilder.getMesh();
            
            element.meshBuilder = meshBuilder;
            element.meshVisual = meshVisual;
        } else if (type === "text") {
            // Create Text component (uses regular Transform, not ScreenTransform)
            const textComp = so.createComponent("Component.Text");
            textComp.text = "";
            textComp.size = 20;
            
            element.textComp = textComp;
        }
        
        return element;
    }

    // Ensure we have a current vector element to draw into with the correct blend mode
    _ensureVectorElement() {
        // Check if we need to flush due to vertex limit (UInt16 max = 65535)
        const needsFlushDueToLimit = this.vertexCount >= MAX_VERTICES_PER_BATCH;
        
        if (this.lastElementType !== "vector" || !this.currentVectorElement ||
            this.lastBlendMode != this.currentBlendMode || needsFlushDueToLimit)
        {
            // Need a new vector element
            this._flushCurrentVector();
            this.currentVectorElement = this._getOrCreateElement("vector");
            this.currentVectorElement.meshVisual.mainPass.blendMode = toLSBlendMode(this.currentBlendMode);
            this.lastBlendMode = this.currentBlendMode;
            this.lastElementType = "vector";
        }
    }

    // Flush current vector element's mesh data
    _flushCurrentVector() {
        if (!this.currentVectorElement || this.vertices.length === 0) {
            return;
        }
        
        const mb = this.currentVectorElement.meshBuilder;
        
        // Clear previous mesh data
        if (mb.getVerticesCount() > 0) {
            mb.eraseVertices(0, mb.getVerticesCount());
        }
        if (mb.getIndicesCount() > 0) {
            mb.eraseIndices(0, mb.getIndicesCount());
        }
        
        // Upload new data
        mb.appendVerticesInterleaved(this.vertices);
        mb.appendIndices(this.indices);
        mb.updateMesh();
        
        // Bind all textures in the batch to their respective slots
        if (this.textureSlots.length > 0) {
            const material = this.currentVectorElement.meshVisual.mainMaterial;
            
            // Bind textures to slots
            for (let i = 0; i < this.textureSlots.length; i++) {
                const samplerName = `baseTex${i}`;
                if (material.mainPass[samplerName] !== undefined) {
                    material.mainPass[samplerName] = this.textureSlots[i];
                }
            }
            
            // Optional: Set texture count uniform for debugging
            if (material.mainPass.textureCount !== undefined) {
                material.mainPass.textureCount = this.textureSlots.length;
            }
        }
        
        // Reset vertex data for next batch
        this.vertices = [];
        this.indices = [];
        this.vertexCount = 0;
        this.textureSlots = [];
        this.textureIdMap.clear();
    }

    // End of frame - flush and move elements to pool
    _endFrame() {
        // Flush any pending vector data
        this._flushCurrentVector();
        
        // Move all active elements to unused pool
        for (let i = this.activeElements.length-1; i>=0; i--) {
            const element = this.activeElements[i];
            if (element.frameCount-- <= 0) {
                element.so.setParent(this.unusedSo);
                element.so.enabled = false;
                
                if (!this.elements[element.type]) {
                    this.elements[element.type] = [];
                }
                this.elements[element.type].push(element);
                this.activeElements.splice(i, 1);
            }
        }
        
        // Reset for next frame
        // this.activeElements = [];
        this.currentVectorElement = null;
        this.lastElementType = null;
        this.transformMatrix = mat3.identity();
    }

    _init(fullscreen, width, height) {
        // Create camera
        this.rendererSo = global.scene.createSceneObject("Canvas Camera");
        this.cameraComp = this.rendererSo.createComponent("Component.Camera");
        this.cameraComp.type = Camera.Type.Orthographic;
        this.cameraComp.near = -1;
        this.cameraComp.far = 200;
        this.cameraComp.renderLayer = LayerSet.makeUnique();
        if (fullscreen) {
            this.cameraComp.devicePropertyUsage = Camera.DeviceProperty.All;
            if (manager.deviceResolution.x == -1) {
                // when manager's device resolution is not ready, take resolution from overlayRT directly
                this.size = new vec2(script.overlayRT.getWidth(), script.overlayRT.getHeight());
            } else {
                this.size = manager.deviceResolution;
            }
        } else {
            this.cameraComp.devicePropertyUsage = Camera.DeviceProperty.None;
            this.cameraComp.aspect = width/height;
            this.size = new vec2(width, height);
        }
        
        this.texture = this._getOrCreateRenderTarget(fullscreen, width, height);
        this.cameraComp.renderTarget = this.texture;
        this.rendererSo.layer = this.cameraComp.renderLayer;
        this.renderLayer = this.cameraComp.renderLayer;

        // Create screen region (parent for all elements)
        this.regionSo = global.scene.createSceneObject("Canvas Region");
        this.regionSo.setParent(this.rendererSo);
        this.regionSo.layer = this.cameraComp.renderLayer;
        this.regionSt = this.regionSo.createComponent("Component.ScreenTransform");
        const regionComp = this.regionSo.createComponent("Component.ScreenRegionComponent");
        regionComp.region = ScreenRegionType.FullFrame;

        // Create root container for active elements
        this.rootSo = global.scene.createSceneObject("Canvas Root");
        this.rootSo.setParent(this.regionSo);
        this.rootSo.layer = this.cameraComp.renderLayer;
        this.rootSo.createComponent("Component.ScreenTransform");

        // Create unused pool container (disabled, holds pooled elements)
        this.unusedSo = global.scene.createSceneObject("Canvas Unused");
        this.unusedSo.setParent(this.regionSo);
        this.unusedSo.layer = this.cameraComp.renderLayer;
        this.unusedSo.enabled = false;

        this._updateWorldCorners();
    }

    _getOrCreateRenderTarget(fullscreen, width, height) {
        // Check if we have one in the pool
        const rt = manager.getUnusedRt(width, height);
        if (rt) {
            return rt;
        }

        // No, create a new one
        const renderTarget = global.scene.createRenderTargetTexture();    
        renderTarget.control.useScreenResolution = fullscreen;
        renderTarget.control.resolutionScale = 1;
        if (!fullscreen) {
            renderTarget.control.resolution = new vec2(width, height);
        }
        renderTarget.control.clearColorOption = ClearColorOption.None;
        renderTarget.control.clearDepthEnabled = false;
        return renderTarget;
    }

    _updateWorldCorners() {
        this.worldTL = this.regionSt.localPointToWorldPoint(new vec2(-1,1));
        this.worldTR = this.regionSt.localPointToWorldPoint(new vec2(1,1));
        this.worldBL = this.regionSt.localPointToWorldPoint(new vec2(-1,-1));
        this.worldBR = this.regionSt.localPointToWorldPoint(new vec2(1,-1));
        this.worldWidth = Math.abs(this.worldTR.x - this.worldTL.x);
        this.worldHeight = Math.abs(this.worldTL.y - this.worldBL.y);
        this.pixelSize = this.getSize().x / this.worldWidth;
    }
}

class CanvasManager {
    constructor() {
        this.unusedRTs = [];
        this.canvases = [];

        // Device resolution workaround
        this.deviceResolution = new vec2(script.overlayRT.getWidth(), script.overlayRT.getHeight());
        this.selfAssignedOverlay = false;
        if (!global.scene.liveOverlayTarget) {
            global.scene.liveOverlayTarget = script.overlayRT;
            this.selfAssignedOverlay = true;
        }
        script.createEvent("OnStartEvent").bind(() => {
            if (global.deviceResolutionWorkaround) {
                this.deviceResolution = global.deviceResolutionWorkaround;
            } else {
                const overlay = global.scene.liveOverlayTarget;
                if (overlay) {
                    this.deviceResolution = new vec2(overlay.getWidth(), overlay.getHeight());
                    global.deviceResolutionWorkaround = this.deviceResolution;
                    if (this.selfAssignedOverlay) {
                        global.scene.liveOverlayTarget = null;
                    }
                }
            }
        });

        script.createEvent("OnDisableEvent").bind(() => {
            print("Disabling render cameras");
            // disable all rendering cameras
            for (const i in this.canvases) {
                const canvas = this.canvases[i];
                canvas.rendererSo.enabled = false;
            }
        });

        script.createEvent("OnEnableEvent").bind(() => {
            print("Enabling render cameras");
            // disable all rendering cameras
            for (const i in this.canvases) {
                const canvas = this.canvases[i];
                canvas.rendererSo.enabled = true;
            }
        });
    }

    createCanvas(width=-1, height=-1) {
        return this._createCanvas({
            offscreen: true,
            fullscreen: (width==-1 && height==-1),
            width: width,
            height: height
        });
    }

    createOnScreenCanvas(width=-1, height=-1) {
        return this._createCanvas({
            offscreen: false,
            fullscreen: (width==-1 && height==-1),
            width: width,
            height: height
        });
    }

    _createCanvas(settings) {
        const canvas = new Canvas(settings.fullscreen, settings.width, settings.height);
        if (!settings.offscreen) {
            canvas.onScreenSo = global.scene.createSceneObject("Canvas Image");
            canvas.onScreenSo.setParent(scriptSo);
            canvas.onScreenSo.layer = scriptLayer;
            canvas.onScreenSo.createComponent("Component.ScreenTransform");
            const imgComp = canvas.onScreenSo.createComponent("Component.Image");
            imgComp.clearMaterials();
            imgComp.addMaterial(script.onscreenMaterial.clone());
            imgComp.stretchMode = StretchMode.Stretch;
            imgComp.mainPass.baseTex = canvas.getTexture();
        }
        canvas.setRenderOrder(settings.offscreen?-10:0);
        this.canvases.push(canvas);
        return canvas;
    }

    destroyCanvas(canvas) {
        if (canvas.updateEvt) {
            script.removeEvent(canvas.updateEvt);
        }
        if (canvas.onScreenSo) {
            canvas.onScreenSo.destroy();
        }
        if (canvas.rendererSo) {
            canvas.rendererSo.destroy();
        }
        if (canvas.texture) {
            this.unusedRTs.push(canvas.texture);
        }
        
        // Remove canvas from the canvases array
        const index = this.canvases.indexOf(canvas);
        if (index !== -1) {
            this.canvases.splice(index, 1);
        }
    }

    getUnusedRt(width, height) {
        for (let i=0; i<this.unusedRTs.length; i++) {
            const rt = this.unusedRTs[i];
            if (rt.getWidth() == width && rt.getHeight() == height) {
                this.unusedRTs.splice(i, 1);
                return rt;
            }
        }

        return null;
    }
}

manager = new CanvasManager();
script.createCanvas = (width, height) => manager.createCanvas(width, height);
script.createOnScreenCanvas = (width, height) => manager.createOnScreenCanvas(width, height);
script.destroyCanvas = (canvas) => manager.destroyCanvas(canvas);
