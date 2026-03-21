/**
 * Canvas API for Lens Studio
 * A 2D drawing API inspired by Processing and p5.js
 */

/**
** IMPORTANT: All examples below assume Canvas API block name is "canvasAPI", use a different name when needed **
*/

/**
** IMPORTANT: When using Canvas API make sure that all code executes on start, which means that you need to create "OnStartEvent" event and call all initialization from there, especially, device real resolution is only available after "OnStartEvent" so any measurements done before it can be imprecise **
Example:
script.createEvent("OnStartEvent").bind(() => {
    // put initialization, canvas creation, screen size retrieval code here
    ...
});
*/

// ============================================================================
// CANVAS CREATION
// ============================================================================

// Create an offscreen canvas (for textures)
const offscreenCanvas = script.canvasAPI.createCanvas(500, 500);
const fullscreenOffscreen = script.canvasAPI.createCanvas(); // fullscreen

// Create an onscreen canvas (for display)
const fullscreenOnscreen = script.canvasAPI.createOnScreenCanvas(); // fullscreen

// Destroy canvas when done, also destroys the canvas texture
canvas.destroy();

// ============================================================================
// BASIC DRAWING SHAPES
// ============================================================================

// Line: line(x1, y1, x2, y2)
canvas.stroke(255);
canvas.strokeWeight(2);
canvas.line(0, 0, 100, 100);

// Circle: circle(x, y, diameter)
// x, y is the center of the circle
canvas.fill(255, 0, 0);
canvas.circle(100, 100, 50);

// Ellipse: ellipse(x, y, width, height)
// x, y is the center of the ellipse
canvas.fill(0, 255, 0);
canvas.ellipse(100, 100, 80, 50);

// Rectangle: rect(x, y, width, height, [r1], [r2], [r3], [r4])
// Optional corner radii: r1=top-left, r2=top-right, r3=bottom-right, r4=bottom-left
canvas.rect(10, 10, 100, 50);           // Simple rectangle
canvas.rect(10, 70, 100, 50, 10);       // All corners rounded
canvas.rect(10, 130, 100, 50, 10, 5, 0, 15); // Different corner radii

// ============================================================================
// COLORS AND STYLING
// ============================================================================

// Fill: fill(r, [g], [b], [a])
// If only one value: grayscale. Default alpha: 255
canvas.fill(255);           // White
canvas.fill(255, 0, 0);     // Red
canvas.fill(0, 255, 0, 128); // Semi-transparent green
canvas.noFill();            // Disable fill

// Stroke: stroke(r, [g], [b], [a])
canvas.stroke(255);           // White stroke
canvas.stroke(255, 0, 0);     // Red stroke
canvas.stroke(0, 255, 0, 128); // Semi-transparent green
canvas.noStroke();            // Disable stroke

// Stroke settings
canvas.strokeWeight(5);  // Line thickness in pixels
canvas.strokeCap('round');  // 'round' or 'square'
canvas.strokeJoin('miter'); // 'miter', 'bevel', or 'round'

// Background: background(r, [g], [b], [a])
// Fills entire canvas
canvas.background(255);           // White
canvas.background(0, 0, 0);       // Black
canvas.background(255, 0, 0, 128); // Semi-transparent red

// Create color value
const myColor = canvas.color(255, 0, 0);
canvas.fill(myColor);

// Color modes: RGB (default), HSB, HSL
canvas.colorMode('rgb', 255);  // RGB 0-255
canvas.colorMode('hsb', 360);  // HSB with hue 0-360
canvas.colorMode('hsl', 100);  // HSL 0-100
// After setting HSB:
canvas.fill(180, 360, 360); // Cyan in HSB

// Blend modes
canvas.blendMode('normal');    // Default blending
canvas.blendMode('add');       // Additive blending
canvas.blendMode('multiply');  // Multiply blending

// Anti-aliasing
canvas.fringeWidth(2.0);  // Default anti-aliasing
canvas.fringeWidth(0);    // Disable anti-aliasing

// ============================================================================
// TRANSFORMATIONS
// ============================================================================

// Translate: translate(x, y)
canvas.translate(100, 50);
canvas.circle(0, 0, 25); // Circle appears at (100, 50)

// Rotate: rotate(angle)
// Angle in degrees or radians depending on angleMode
canvas.angleMode('degrees'); // Default
canvas.rotate(45); // Rotate 45 degrees

canvas.angleMode('radians');
canvas.rotate(Math.PI / 2); // Rotate π/2 radians

// Scale: scale(sx, [sy])
// If sy omitted, uses sx for uniform scaling
canvas.scale(2);       // Double size
canvas.scale(2, 0.5);  // Stretch horizontally, compress vertically

// Save/restore state: push() and pop()
canvas.push();
canvas.translate(100, 100);
canvas.rotate(45);
canvas.circle(0, 0, 25);
canvas.pop(); // Restore previous state

// Reset transformations
canvas.resetMatrix(); // Back to identity matrix

// Apply custom matrix
const customMatrix = mat3.identity();
canvas.applyMatrix(customMatrix);

// ============================================================================
// CUSTOM SHAPES
// ============================================================================

// Create custom shape with vertices
canvas.beginShape();
canvas.vertex(100, 100);
canvas.vertex(200, 100);
canvas.vertex(150, 200);
canvas.endShape(true); // true = close shape

// Bezier curves in shapes
canvas.beginShape();
canvas.vertex(100, 100);
canvas.bezierVertex(150, 50, 200, 100, 250, 150);
// bezierVertex(incomingControlX, incomingControlY, anchorX, anchorY, outgoingControlX, outgoingControlY)
canvas.endShape();

// Standalone bezier curve
canvas.bezier(50, 100, 100, 50, 200, 150, 250, 100);
// bezier(x1, y1, cx1, cy1, cx2, cy2, x2, y2)

// Control bezier smoothness
canvas.bezierDetail(20); // Default: 20 segments (smooth)
canvas.bezierDetail(5);  // 5 segments (angular)

// ============================================================================
// IMAGES
// ============================================================================

// Draw image: image(texture, x, y, [w], [h], [sx], [sy], [sWidth], [sHeight])
canvas.image(myTexture, 0, 0);                      // Draw entire texture
canvas.image(myTexture, 0, 0, 200, 100);            // Scale to 200x100
canvas.image(myTexture, 0, 0, 50, 50, 100, 100, 50, 50); // Draw portion (sprite sheet)

// Image positioning modes
canvas.imageMode('corner');  // x,y = top-left corner (default)
canvas.imageMode('center');  // x,y = center
canvas.imageMode('corners'); // x,y = top-left, w,h = bottom-right

// ============================================================================
// TEXT
// ============================================================================

// Draw text: text(str, x, y)
canvas.textSize(24);
canvas.textAlign('center', 'middle');
canvas.fill(255);
canvas.text("Hello World", width/2, height/2);
canvas.text(score, 10, 10); // Numbers are converted to strings

// Text alignment
canvas.textAlign('left', 'top');       // Top-left
canvas.textAlign('center', 'middle');  // Center
canvas.textAlign('right', 'bottom');   // Bottom-right

// Text with stroke (outline)
canvas.fill(255, 255, 0);
canvas.stroke(0);
canvas.strokeWeight(2);
canvas.text("Outlined Text", 100, 100);

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Get canvas properties
const texture = canvas.getTexture(); // Returns Asset.Texture
const size = canvas.getSize();       // Returns vec2(width, height)
const width = canvas.getWidth();     // Returns number
const height = canvas.getHeight();   // Returns number

// Use canvas texture on sprite
sprite.texture = canvas.getTexture();

// Convert touch coordinates to canvas pixel coordinates (this only works when the canvas is stretched on the entire screen)
// Touch coords from touchManager are normalized (0-1)
script.touchManager.onTouchDown.add((id, x, y) => {
    const pixelPos = new vec2(x, y).mult(canvas.getSize());
    // Now pixelPos is in canvas pixel coordinates
});

// ============================================================================
// STRING CONSTANTS
// ============================================================================

// All functions accept string literals

// Line caps
'round'   // Rounded line endpoints
'square'  // Square line endpoints

// Line joins
'miter'  // Sharp corners
'bevel'  // Beveled corners
'round'  // Rounded corners

// Color modes
'rgb'  // Red, Green, Blue (default)
'hsb'  // Hue, Saturation, Brightness
'hsl'  // Hue, Saturation, Lightness

// Angle modes
'degrees'  // Angles in degrees (default)
'radians'  // Angles in radians

// Blend modes
'normal'    // Standard blending (default)
'add'       // Additive blending
'multiply'  // Multiply blending

// Image modes
'corner'   // Position from corner (default)
'center'   // Position from center
'corners'  // Position from opposite corners

// Text alignment - Horizontal
'left'    // Left aligned
'center'  // Center aligned
'right'   // Right aligned

// Text alignment - Vertical
'top'     // Top aligned
'middle'  // Middle aligned
'bottom'  // Bottom aligned

// ============================================================================
// COMMON PATTERNS
// ============================================================================

// Pattern: Drawing centered shapes
const w = canvas.getWidth();
const h = canvas.getHeight();
canvas.translate(w/2, h/2);
canvas.circle(0, 0, 100); // Circle at canvas center (after translate)

// Pattern: Rotating around a point
canvas.push();
canvas.translate(200, 200);
canvas.rotate(45);
canvas.rect(-25, -25, 50, 50); // Draw centered on rotation point
canvas.pop();

// Pattern: Animating canvas
script.createEvent("UpdateEvent").bind(() => {
    canvas.background(255,255,255,0);
    const time = getTime();
    const x = width/2 + Math.sin(time * 2) * 100;
    const y = height/2 + Math.cos(time * 2) * 100;
    canvas.circle(x, y, 50); // Circle follows circular path around center
});

// Pattern: Creating healthbar
function drawHealthbar(canvas, x, y, w, h, healthPercent) {
    canvas.noStroke();
    // Background (red)
    canvas.fill(180, 50, 50);
    canvas.rect(x, y, w, h, h * 0.5);
    // Foreground (green)
    canvas.fill(50, 255, 50);
    canvas.rect(x, y, w * healthPercent, h, h * 0.5);
    // Border
    canvas.noFill();
    canvas.strokeWeight(2);
    canvas.stroke(255);
    canvas.rect(x, y, w, h, h * 0.5);
}

// Pattern: Using offscreen canvas for sprite textures
// Note that we add some padding to the canvas size so stroke will not be cut by the boundaries
const pad = 4;
const myCanvas = script.canvasAPI.createCanvas(200+2*pad, 200+2*pad);
myCanvas.background(255, 0, 0);
myCanvas.fill(255, 255, 0);
myCanvas.circle(0.5*myCanvas.getWidth(), 0.5*myCanvas.getHeight(), 80); // Centered circle

const sprite = script.spriteMgr.createSprite("MySprite");
sprite.texture = myCanvas.getTexture();
sprite.size = myCanvas.getSize();
sprite.position = new vec2(540, 960);

// Pattern: Dynamic canvas (updates each frame)
const dynamicCanvas = script.canvasAPI.createCanvas(300, 300);
script.createEvent("UpdateEvent").bind(() => {
    dynamicCanvas.background(255, 255, 255, 0);
    dynamicCanvas.fill(255);
    dynamicCanvas.textSize(12);
    dynamicCanvas.text("Score: " + score, 150, 150);
    // Sprite texture automatically updates
});
sprite.texture = dynamicCanvas.getTexture();

// Pattern: Custom shape (polygon)
canvas.beginShape();
for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    canvas.vertex(x, y);
}
canvas.endShape(true); // Close shape

// Pattern: Bezier curve shape
canvas.beginShape();
canvas.vertex(100, 100);
canvas.bezierVertex(150, 50, 200, 100, 250, 150);
canvas.bezierVertex(300, 200, 350, 150, 400, 200);
canvas.endShape();

// ============================================================================
// COMPLETE API REFERENCE
// ============================================================================

/**
 * Canvas Creation (CanvasManager)
 */
script.canvasAPI.createCanvas(width, height)        // Offscreen canvas (texture)
script.canvasAPI.createOnScreenCanvas()             // Creates full-screen, onscreen canvas (display)
canvas.destroy()                                     // Clean up resources

/**
 * Canvas Properties
 */
canvas.getTexture()   // Returns Asset.Texture - render target
canvas.getSize()      // Returns vec2 - canvas dimensions
canvas.getWidth()     // Returns number - canvas width
canvas.getHeight()    // Returns number - canvas height

/**
 * Basic Shapes
 */
canvas.line(x1, y1, x2, y2)              // Draw line
canvas.circle(x, y, diameter)            // Draw circle (x,y = CENTER of circle)
canvas.ellipse(x, y, width, height)      // Draw ellipse (x,y = CENTER of ellipse)
canvas.rect(x, y, w, h, [r1], [r2], [r3], [r4]) // Draw rectangle (x,y = top-left, optional corner radii)

/**
 * Fill and Stroke
 */
canvas.fill(r, [g], [b], [a])      // Set fill color (g,b,a optional), fill color is also used as image tint color
canvas.noFill()                    // Disable fill
canvas.stroke(r, [g], [b], [a])    // Set stroke color (g,b,a optional)
canvas.noStroke()                  // Disable stroke
canvas.strokeWeight(weight)        // Set stroke thickness in pixels
canvas.strokeCap(cap)              // Set line cap: 'round' or 'square'
canvas.strokeJoin(join)            // Set line join: 'miter', 'bevel', or 'round'
canvas.fringeWidth(width)          // Set anti-aliasing width (default: 2.0)

/**
 * Background
 */
canvas.background(r, [g], [b], [a]) // Fill entire canvas with color

/**
 * Color Utilities
 */
canvas.color(r, [g], [b], [a])     // Create color value (returns vec4)
canvas.colorMode(mode, [maxValue]) // Set color mode: 'rgb', 'hsb', or 'hsl'

/**
 * Blend Modes
 */
canvas.blendMode(mode) // Set blend mode: 'normal', 'add', or 'multiply'

/**
 * Transformations
 */
canvas.translate(x, y)       // Move coordinate system
canvas.rotate(angle)         // Rotate coordinate system (clockwise)
canvas.scale(sx, [sy])       // Scale coordinate system (sy defaults to sx)
canvas.push()                // Save current transform state
canvas.pop()                 // Restore saved transform state
canvas.resetMatrix()         // Reset to identity (no transforms)
canvas.applyMatrix(matrix)   // Apply custom mat3 matrix
canvas.angleMode(mode)       // Set angle mode: 'degrees' or 'radians'

/**
 * Custom Shapes
 */
canvas.beginShape()            // Start recording shape vertices
canvas.vertex(x, y)            // Add vertex to shape
canvas.bezierVertex(cx1, cy1, ax, ay, cx2, cy2) // Add bezier curve vertex
canvas.endShape([close])       // Finish and draw shape (close = true to close)
canvas.bezier(x1, y1, cx1, cy1, cx2, cy2, x2, y2) // Draw standalone bezier curve
canvas.bezierDetail(detail)    // Set bezier curve smoothness (segments)

/**
 * Images
 */
canvas.image(texture, x, y, [w], [h], [sx], [sy], [sWidth], [sHeight])
// Draw texture at position with optional scaling and source cropping
canvas.imageMode(mode) // Set image positioning: 'corner', 'center', or 'corners'
// Fill color will be used as image tint color, so to render the image fully opaque with its original colors make sure fill color is set to white like so:
canvas.fill(255)

/**
 * Text
 */
canvas.text(str, x, y)              // Draw text (str can be string or number)
canvas.textSize(size)               // Set text size in pixels
canvas.textAlign(horizAlign, [vertAlign]) // Set text alignment

/**
 * String Constants (use directly)
 */
// Line caps
'round', 'square'

// Line joins
'miter', 'bevel', 'round'

// Color modes
'rgb', 'hsb', 'hsl'

// Angle modes
'degrees', 'radians'

// Blend modes
'normal', 'add', 'multiply'

// Image modes
'corner', 'center', 'corners'

// Text alignment - Horizontal
'left', 'center', 'right'

// Text alignment - Vertical
'top', 'middle', 'bottom'

// ============================================================================
// EXAMPLE: COMPLETE DRAWING
// ============================================================================

//@input Component.Script canvas
//@input Component.Script spriteMgr

// Create canvas
const canvas = script.canvasAPI.createCanvas(500, 500);

// Setup
canvas.background(255);
canvas.noStroke();

// Draw red circle (x,y is the center)
canvas.fill(255, 0, 0);
canvas.circle(100, 100, 80);

// Draw green rectangle with rounded corners
canvas.fill(0, 255, 0);
canvas.rect(200, 200, 100, 50, 10);

// Draw blue triangle using custom shape
canvas.fill(0, 0, 255);
canvas.beginShape();
canvas.vertex(300, 300);
canvas.vertex(400, 300);
canvas.vertex(350, 400);
canvas.endShape(true);

// Draw text
canvas.fill(0);
canvas.textSize(24);
canvas.textAlign('center', 'middle');
canvas.text("Hello Canvas!", 250, 250);

// Use canvas as sprite texture
const sprite = script.spriteMgr.createSprite("MySprite");
sprite.texture = canvas.getTexture();
sprite.size = canvas.getSize();
sprite.position = script.spriteMgr.getScreenSize().mult(new vec2(0.5, 0.5));

// ============================================================================
// EXAMPLE: CUSTOM JOYSTICK
// ============================================================================

const joystickSize = 200;
const joystickCanvas = script.canvasAPI.createCanvas(joystickSize, joystickSize);
const joystickSprite = script.spriteMgr.createSprite("Joystick");
joystickSprite.texture = joystickCanvas.getTexture();
joystickSprite.size = joystickCanvas.getSize();
joystickSprite.position = new vec2(150, 1700);
joystickSprite.alpha = 0.7;

function drawJoystick(knobOffsetX, knobOffsetY) {
    const centerX = joystickSize * 0.5;
    const centerY = joystickSize * 0.5;
    const radius = joystickSize * 0.4;
    const knobRadius = radius * 0.4;
    
    joystickCanvas.background(255, 255, 255, 0);
    
    // Outer circle
    joystickCanvas.noFill();
    joystickCanvas.strokeWeight(4);
    joystickCanvas.stroke(255, 255, 255, 150);
    joystickCanvas.circle(centerX, centerY, radius * 2);
    
    // Knob
    const knobX = centerX + knobOffsetX * (radius - knobRadius);
    const knobY = centerY + knobOffsetY * (radius - knobRadius);
    joystickCanvas.fill(255, 255, 255, 200);
    joystickCanvas.noStroke();
    joystickCanvas.circle(knobX, knobY, knobRadius * 2);
}

drawJoystick(0, 0); // Initial draw

// ============================================================================
// BEST PRACTICES
// ============================================================================

// 1. Offscreen vs Onscreen:
//    - Use createCanvas() for offscreen rendering (textures for sprites)
//    - Use createOnScreenCanvas() for direct display on screen

// 2. Using Canvas API with Sprite Manager
//    - Sprite Manager and Canvas API use different coordinate spaces, when creating a full-screen canvas it does not necessarily share the same size reported by Sprite Manager getScreenSize. Make sure you follow these rules:
//      1. When drawing inside a canvas use the canvas size (reported by canvas.getWidth(), canvas.getHeight(), or canvas.getSize()).
//      2. When using a Sprite to render a canvas texture, use Sprite Manager's coordinate space for .size and .position (taken from getScreenSize()).

// 2. Resource Management:
//    - Call canvas.destroy() when done to free resources
//    - Reuse textures when possible instead of creating new canvases
//    - The engine DOES NOT retain canvas textures, only destroy a canvas when its texture is not needed

// 3. Performance:
//    - Canvas automatically batches draw calls by blend mode
//    - Use noStroke() and noFill() to skip unnecessary rendering
//    - Lower bezierDetail() for better performance on curves
//    - Create textures once and reuse (bullets, UI elements, etc.)

// 4. Transformations:
//    - Always use push()/pop() to isolate transform changes

// 5. Touch handling:
//    - Touch coords from touchManager are normalized (0-1)
//    - Convert to canvas pixels: new vec2(x, y).mult(canvas.getSize())
//    - Finding canvas coordinates for touches inside sprites: use hitTest() then toLocalPosition() then convert to canvas coords
//      Example:
//      const pixel = script.spriteMgr.unitToPixel(new vec2(x, y));
//      const hits = script.spriteMgr.hitTest(pixel);
//      if (hits.length > 0) {
//          const sprite = hits[0];
//          const localPos = sprite.toLocalPosition(pixel); // Local to sprite (0,0 = sprite center)
//          const canvasPos = localPos.add(new vec2(sprite.size.x * 0.5, sprite.size.y * 0.5)); // Canvas coords (0,0 = top-left)
//      }
//    - When using canvas to create UI widgets check touch within widget only on touch down,, then, on touch move act as if the touch should belong to the widget even if its outside of its bounds. For example, when creating a circular dial widget check touch inside the ring only on touch down, then on touch move calculate the angle without checking that the touch is inside the ring (same for slider, etc.)

// 6. Text Sizing:
//    - Text size is in pixels and consistent across different canvas sizes
//    - Use reasonable values like 12, 24, 48 for text size

// 7. Clearing Background:
//    - When clearing the background to transparent color set the color to a value that is close to colors that will be rendered on top of it with 0 alpha.
//      For example:
//      if we expect white lines to be drawn use white: canvas.background(255,255,255,0)
//      if we expect black lines use black: canvas.background(0,0,0,0)
//      if we expect many colors use gray: canvas.background(128,128,128,0)


// ============================================================================
// NOTES
// ============================================================================

// - Coordinate system: (0,0) is top-left, positive x is right, positive y is down
// - Color values default to 0-255 range, configurable with colorMode()
// - Transformations affect all subsequent draw calls until reset or pop()
// - Canvas uses element pooling for efficient rendering across frames
// - Anti-aliasing is enabled by default (fringeWidth = 2.0)
// - When creating off-screen canvas for a game element, increase its size with some padding so the entire shape that is drawn will fit inside its boundaries. This is important when drawing shapes with a stroke because the stroke extends by half of its width outside of the given coordinates.
// - You can query a texture size by using texture.getWidth() and texture.getHeight(). Use that when needed for textures provided by Sprite Store. This is especially useful when splitting textures into smaller pieces.
