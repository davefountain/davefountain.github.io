// ================= Dave's Effects (DFX) =================
// A JS-to-GLSL compiler for per-pixel image filters/FX, running on raw
// WebGL via p5's WEBGL renderer. Everything - schema-free uniform
// inference, the GLSL emitter, stdlib functions, and run() itself - lives
// inside this one class.
//
// Usage:
//   let dfx = new DFX();
//   let result = dfx.run(sourceImg, { shaderFunc: setPixel, uniforms }, 'GPU');
//   let chained = dfx.run(sourceImg, [filterA, filterB], 'GPU');
//
// run() is the single public entry point for both CPU and GPU, for both
// single filters and chains - a single filter is just a chain of length 1.
// runCPU/GPUCompile/runGPU from the original library are now private
// methods (#runCPU, #compileGPU, #runGPUChain) since sketch code never
// needs to call them directly anymore.
//
// A shader function declares one of three signatures - DFX detects which
// one via the function's own arity (shaderFunc.length), no separate
// registration needed:
//   function myFilter(color, x, y, image, uniforms) { ... }
//   function myFilter(color, x, y, image, uniforms, imageW, imageH) { ... }
//   function myFilter(color, x, y, image, uniforms, imageW, imageH, altImage) { ... }
// altImage is a second, same-size image for the filter to compare against
// (e.g. a previous frame, an unfiltered original) - supplied per-call via
// { shaderFunc, uniforms, altImage: someImg } in the filter entry, and
// read the same way as `image`: altImage.sample(px, py).

// ---------- Shared stdlib: bare function calls (floor(x), lerp(a,b,t), etc.) ----------
// Three categories of GLSL-compatible function exist, and this single table
// covers the first two:
//   1. Same name, same behavior in both JS/p5 and GLSL (e.g. floor, sin) —
//      the map entry's key and value are identical.
//   2. Same behavior, different name (e.g. p5's lerp == GLSL's mix) — the
//      map entry's value is the GLSL name to emit instead of the JS name
//      you actually wrote.
// Either way: write the JS/p5 name in your shader function, and the
// compiler looks up what to emit in GLSL. CPU-side needs zero special
// handling for either category — these are already real, working JS/p5
// functions, so runCPU just calls them as normal.
const STDLIB_FUNCTIONS = {
  float:     'float',
  floor:     'floor',
  sin:       'sin',
  cos:       'cos',
  tan:       'tan',
  sqrt:      'sqrt',
  abs:       'abs',
  pow:       'pow',
  exp:       'exp',
  log:       'log',
  asin:      'asin',
  acos:      'acos',
  atan:      'atan',
  radians:   'radians',
  degrees:   'degrees',
  min:       'min',      // 2-argument float form only — p5's min() also
  max:       'max',      // accepts arrays/3+ args, which this doesn't validate against
  lerp:      'mix',      // renamed: p5's lerp(a,b,t) == GLSL's mix(a,b,t)
  constrain: 'clamp',    // renamed: p5's constrain(x,lo,hi) == GLSL's clamp(x,lo,hi)
  atan2:     'atan',     // renamed: p5's atan2(y,x) == GLSL's two-argument atan(y,x)
};

// ---------- DFX.* builtins: GLSL functions with no JS/p5 equivalent ----------
// Category 3: functions that exist in GLSL but have no JS/p5 global to
// piggyback on. Written as DFX.foo(...) in your shader function. The
// compiler strips the "DFX." prefix and emits the bare GLSL name; cpuImpl
// provides the real JS behavior so runCPU (which just calls your shader
// function as plain JS) works identically. argCount is checked at compile
// time to catch obviously-wrong call sites early.
const DFX_BUILTINS = {
  fract: {
    argCount: 1,
    cpuImpl: (x) => x - Math.floor(x),
  },
  smoothstep: {
    argCount: 3,
    cpuImpl: (edge0, edge1, x) => {
      let t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1);
      return t * t * (3 - 2 * t);
    },
  },
};

// Comparison operators produce a bool in GLSL, not the operand type -
// needed so `let inRange = x > lo && x < hi;` infers correctly as `bool`
// rather than incorrectly inheriting `float` from its left operand.
const COMPARISON_OPERATORS = ['<', '>', '<=', '>=', '==', '!='];

// ---------- Mini JS-to-GLSL compiler (module-level helpers) ----------
// Parsing is handled by Acorn (loaded globally via index.html) — we only
// write the GLSL-emitting half. Deliberately minimal: only understands
// the exact JS shapes our setPixel-style filters currently use.
// Unsupported syntax throws a clear error rather than doing the wrong thing.

function calleePath(node) {
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'MemberExpression') return calleePath(node.object) + '.' + node.property.name;
  throw new Error('GPUCompile: unsupported constructor callee shape');
}

function emitExpr(node) {
  switch (node.type) {
    case 'Literal':
      if (typeof node.value === 'boolean') return node.value.toString();
      return Number.isInteger(node.value) ? node.value + '.0' : node.value.toString();
    case 'Identifier':
      return node.name;
    case 'MemberExpression':
      if (node.computed) throw new Error('GPUCompile: bracket-style member access (a[b]) is not supported');
      // uniforms.xyz -> just "xyz": uniforms are globals in GLSL, not struct fields
      if (node.object.type === 'Identifier' && node.object.name === 'uniforms') return node.property.name;
      return emitExpr(node.object) + '.' + node.property.name;
    case 'BinaryExpression':
      return `(${emitExpr(node.left)} ${node.operator} ${emitExpr(node.right)})`;
    case 'LogicalExpression':
      if (node.operator !== '&&' && node.operator !== '||') {
        throw new Error(`GPUCompile: unsupported logical operator '${node.operator}' — only && and || are supported`);
      }
      return `(${emitExpr(node.left)} ${node.operator} ${emitExpr(node.right)})`;
    case 'ConditionalExpression':
      // JS/GLSL ternary syntax is identical: test ? consequent : alternate
      return `(${emitExpr(node.test)} ? ${emitExpr(node.consequent)} : ${emitExpr(node.alternate)})`;
    case 'NewExpression': {
      let path = calleePath(node.callee);
      if (path === 'DFX.ColorVec') return `vec4(${node.arguments.map(emitExpr).join(', ')})`;
      throw new Error('GPUCompile: unsupported constructor ' + path);
    }
    case 'CallExpression': {
      if (node.callee.type === 'MemberExpression') {
        let obj = node.callee.object;
        let methodName = node.callee.property.name;

        // DFX.foo(...) -> GLSL builtin with no JS/p5 equivalent (category 3).
        // Checked before the .sample()/.add()/.scale() cases below, since
        // this is a distinct namespace, not a method on a ColorVec/image.
        if (obj.type === 'Identifier' && obj.name === 'DFX') {
          if (!DFX_BUILTINS[methodName]) {
            throw new Error(`GPUCompile: 'DFX.${methodName}' is not a supported builtin — available: ${Object.keys(DFX_BUILTINS).join(', ')}`);
          }
          let expected = DFX_BUILTINS[methodName].argCount;
          if (node.arguments.length !== expected) {
            throw new Error(`GPUCompile: 'DFX.${methodName}' expects ${expected} argument(s), got ${node.arguments.length}`);
          }
          return `${methodName}(${node.arguments.map(emitExpr).join(', ')})`;
        }

        if (methodName === 'sample' && node.arguments.length === 2) {
          // image.sample(px, py) -> texture2D(image, uv). resolution is a
          // global uniform, visible here without needing to be passed in.
          let imgExpr = emitExpr(obj);
          let pxExpr = emitExpr(node.arguments[0]);
          let pyExpr = emitExpr(node.arguments[1]);
          return `texture2D(${imgExpr}, vec2(${pxExpr} / resolution.x, ${pyExpr} / resolution.y))`;
        }
        if (methodName === 'add' && node.arguments.length === 1) {
          return `(${emitExpr(obj)} + ${emitExpr(node.arguments[0])})`;
        }
        if (methodName === 'scale' && node.arguments.length === 1) {
          return `(${emitExpr(obj)} * ${emitExpr(node.arguments[0])})`;
        }
        throw new Error(`GPUCompile: unsupported method call '.${methodName}()'`);
      }
      if (node.callee.type !== 'Identifier') {
        throw new Error('GPUCompile: only plain function calls are supported (e.g. floor(x)), not method calls');
      }
      let name = node.callee.name;
      if (!STDLIB_FUNCTIONS[name]) {
        throw new Error(`GPUCompile: '${name}' is not a supported stdlib function — available: ${Object.keys(STDLIB_FUNCTIONS).join(', ')}`);
      }
      // Emit the GLSL-side name, which may differ from the JS/p5 name you
      // actually wrote (e.g. lerp -> mix). Same-name entries are a no-op here.
      let glslName = STDLIB_FUNCTIONS[name];
      return `${glslName}(${node.arguments.map(emitExpr).join(', ')})`;
    }
    default:
      throw new Error(`GPUCompile: cannot emit expression of type '${node.type}' — this JS construct isn't supported inside a shader function`);
  }
}

// ---------- Minimal type inference ----------
// Just enough to pick the right GLSL type for a `let` declaration.
// typeEnv maps variable/parameter names to their inferred GLSL type,
// seeded with the fixed parameter types before a function body is walked.
function inferType(node, typeEnv) {
  switch (node.type) {
    case 'Literal':
      return typeof node.value === 'boolean' ? 'bool' : 'float';
    case 'Identifier':
      if (typeEnv[node.name]) return typeEnv[node.name];
      throw new Error(`GPUCompile: cannot determine the type of '${node.name}' — was it declared with 'let' earlier in the function?`);
    case 'MemberExpression':
      // uniforms.xyz and color.r/.g/.b/.a are both single scalars here —
      // no vec-valued uniforms or swizzle-groups (e.g. color.rgb) supported yet.
      return 'float';
    case 'BinaryExpression':
      // Comparisons (a > b, a == b, ...) produce bool; arithmetic (a + b,
      // a * b, ...) assumes both sides already match and takes the left
      // operand's type.
      if (COMPARISON_OPERATORS.includes(node.operator)) return 'bool';
      return inferType(node.left, typeEnv);
    case 'LogicalExpression':
      return 'bool';
    case 'ConditionalExpression':
      // Assume both branches already agree on type, same assumption
      // arithmetic BinaryExpression makes about its two operands.
      return inferType(node.consequent, typeEnv);
    case 'NewExpression':
      return 'vec4'; // only DFX.ColorVec is a supported constructor
    case 'CallExpression':
      if (node.callee.type === 'MemberExpression') {
        let obj = node.callee.object;
        let methodName = node.callee.property.name;
        if (obj.type === 'Identifier' && obj.name === 'DFX') {
          if (!DFX_BUILTINS[methodName]) {
            throw new Error(`GPUCompile: cannot determine the type of 'DFX.${methodName}()'`);
          }
          return 'float'; // all current DFX.* builtins are float-in/float-out
        }
        if (methodName === 'sample') return 'vec4';
        if (methodName === 'add' || methodName === 'scale') return inferType(obj, typeEnv);
        throw new Error(`GPUCompile: cannot determine the type of '.${methodName}()'`);
      }
      return 'float'; // all current STDLIB_FUNCTIONS entries are float-in float-out here
    default:
      throw new Error(`GPUCompile: cannot determine the type of expression '${node.type}'`);
  }
}

function emitStatement(node, typeEnv, indent = '  ') {
  switch (node.type) {
    case 'VariableDeclaration': {
      let decl = node.declarations[0];
      let type = inferType(decl.init, typeEnv);
      typeEnv[decl.id.name] = type; // so later statements referencing this variable know its type
      return `${indent}${type} ${decl.id.name} = ${emitExpr(decl.init)};`;
    }
    case 'ExpressionStatement': {
      // The only expression-statements we support are assignments
      // (including compound ones like +=) and ++/-- on an already-declared
      // variable.
      let expr = node.expression;

      if (expr.type === 'UpdateExpression') {
        if (expr.argument.type !== 'Identifier') {
          throw new Error('GPUCompile: increment/decrement target must be a plain variable');
        }
        if (!typeEnv[expr.argument.name]) {
          throw new Error(`GPUCompile: cannot increment/decrement '${expr.argument.name}' — it was never declared with 'let'`);
        }
        let op = expr.operator === '++' ? '+=' : '-=';
        return `${indent}${expr.argument.name} ${op} 1.0;`;
      }

      if (expr.type !== 'AssignmentExpression') {
        throw new Error(`GPUCompile: only assignment expressions are supported as statements, got '${expr.type}'`);
      }
      if (expr.left.type !== 'Identifier') {
        throw new Error('GPUCompile: assignment target must be a plain variable, not ' + expr.left.type);
      }
      if (!typeEnv[expr.left.name]) {
        throw new Error(`GPUCompile: cannot assign to '${expr.left.name}' — it was never declared with 'let'`);
      }
      const allowedOps = ['=', '+=', '-=', '*=', '/='];
      if (!allowedOps.includes(expr.operator)) {
        throw new Error(`GPUCompile: unsupported assignment operator '${expr.operator}'`);
      }
      return `${indent}${expr.left.name} ${expr.operator} ${emitExpr(expr.right)};`;
    }
    case 'IfStatement': {
      let cons = node.consequent.body.map(s => emitStatement(s, typeEnv, indent + '  ')).join('\n');
      let out = `${indent}if (${emitExpr(node.test)}) {\n${cons}\n${indent}}`;
      if (node.alternate) {
        if (node.alternate.type === 'IfStatement') {
          // else-if chain: recurse at the SAME indent level (this stays
          // one logical "rung" of the chain, not a deeper nesting level),
          // then strip the leading indent so it continues on the same
          // line as the '} else' that precedes it.
          let elseIfFull = emitStatement(node.alternate, typeEnv, indent);
          let elseIfStr = elseIfFull.startsWith(indent) ? elseIfFull.slice(indent.length) : elseIfFull;
          out += ` else ${elseIfStr}`;
        } else if (node.alternate.type === 'BlockStatement') {
          let alt = node.alternate.body.map(s => emitStatement(s, typeEnv, indent + '  ')).join('\n');
          out += ` else {\n${alt}\n${indent}}`;
        } else {
          throw new Error(`GPUCompile: else-branch must be a block ('{ ... }') or another if statement, got '${node.alternate.type}'`);
        }
      }
      return out;
    }
    case 'ForStatement': {
      // Deliberately restricted to the one shape GLSL ES drivers reliably
      // compile: a loop variable starting at a literal 0, a literal integer
      // bound, and a plain increment. No variable bounds, no while-loops,
      // no break/continue — this is meant for fixed iteration counts
      // (e.g. fbm octaves), not general iteration.
      if (
        !node.init || node.init.type !== 'VariableDeclaration' ||
        node.init.declarations.length !== 1 ||
        node.init.declarations[0].init.type !== 'Literal' ||
        node.init.declarations[0].init.value !== 0
      ) {
        throw new Error("GPUCompile: for-loops must start with 'let i = 0'");
      }
      let loopVar = node.init.declarations[0].id.name;

      if (
        !node.test || node.test.type !== 'BinaryExpression' ||
        node.test.operator !== '<' ||
        node.test.left.type !== 'Identifier' || node.test.left.name !== loopVar ||
        node.test.right.type !== 'Literal' || !Number.isInteger(node.test.right.value)
      ) {
        throw new Error(`GPUCompile: for-loops must have a constant integer bound, e.g. '${loopVar} < 6'`);
      }
      let bound = node.test.right.value;

      if (
        !node.update || node.update.type !== 'UpdateExpression' ||
        node.update.operator !== '++' ||
        node.update.argument.type !== 'Identifier' || node.update.argument.name !== loopVar
      ) {
        throw new Error(`GPUCompile: for-loops must increment with '${loopVar}++'`);
      }

      if (node.body.type !== 'BlockStatement') {
        throw new Error('GPUCompile: for-loop body must be a block statement');
      }

      typeEnv[loopVar] = 'int';
      let bodyGLSL = node.body.body.map(s => emitStatement(s, typeEnv, indent + '  ')).join('\n');
      return `${indent}for (int ${loopVar} = 0; ${loopVar} < ${bound}; ${loopVar}++) {\n${bodyGLSL}\n${indent}}`;
    }
    case 'ReturnStatement':
      return `${indent}return ${emitExpr(node.argument)};`;
    default:
      throw new Error(`GPUCompile: cannot emit statement of type '${node.type}'`);
  }
}

function inferUniformType(value) {
  if (typeof value === 'number') return 'float';
  if (Array.isArray(value)) {
    if (value.length === 2) return 'vec2';
    if (value.length === 3) return 'vec3';
    if (value.length === 4) return 'vec4';
  }
  throw new Error('GPUCompile: cannot infer a GLSL type for uniform value: ' + value);
}

// A filter function's uniforms "shape" (keys + inferred GLSL type per key),
// used to detect if a cached compiled shader has gone stale — see
// #getCompiledShader below.
function uniformShape(uniforms) {
  let shape = {};
  for (let key in uniforms) shape[key] = inferUniformType(uniforms[key]);
  return shape;
}

function shapesMatch(a, b) {
  let aKeys = Object.keys(a), bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every(k => a[k] === b[k]);
}


class DFX {

  static _vertexShaderSrc = `
    precision highp float;
    attribute vec3 aPosition;
    attribute vec2 aTexCoord;
    varying vec2 vTexCoord;
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    void main() {
      vTexCoord = aTexCoord;
      vec4 positionVec4 = vec4(aPosition, 1.0);
      gl_Position = uProjectionMatrix * uModelViewMatrix * positionVec4;
    }
  `;

  // ---------- ColorVec: the thin color wrapper class ----------
  // (compiles to GLSL's vec4 on the GPU path)
  static ColorVec = class ColorVec {
    constructor(r, g, b, a = 1) {
      this.r = r; this.g = g; this.b = b; this.a = a;
    }
    add(other) {
      return new DFX.ColorVec(this.r + other.r, this.g + other.g, this.b + other.b, this.a + other.a);
    }
    scale(s) {
      return new DFX.ColorVec(this.r * s, this.g * s, this.b * s, this.a * s);
    }
  };

  // ---------- DFX.* builtins (category 3: GLSL functions with no JS/p5 equivalent) ----------
  // Generated from DFX_BUILTINS above so the CPU implementation and the
  // compiler's compile-time knowledge of these functions can never drift
  // out of sync with each other.
  static fract(x) { return DFX_BUILTINS.fract.cpuImpl(x); }
  static smoothstep(edge0, edge1, x) { return DFX_BUILTINS.smoothstep.cpuImpl(edge0, edge1, x); }

  // ---------- private instance state ----------
  // #shaderCache: one compiled p5.Shader per distinct shaderFunc, so a
  // chain re-run every frame doesn't recompile GLSL each time. Keyed by
  // function reference (not name), consistent with how shaderFunc is
  // passed around everywhere else in this library.
  #shaderCache = new Map();

  // #gpuCanvas: a single reused 1x1 createGraphics(WEBGL) context. It's
  // never itself resized or drawn to directly for chain output - it only
  // exists to (a) compile shaders via .createShader() and (b) issue the
  // actual draw calls that #fboA/#fboB capture. Both framebuffers below
  // are created FROM this canvas, so they share its GL context - that's
  // what lets a shader compiled once be used to render into either one,
  // with no cross-context shader recompilation and no CPU roundtrip
  // between chained filters.
  #gpuCanvas = null;
  #fboA = null;
  #fboB = null;

  #ensureGpuCanvas() {
    if (!this.#gpuCanvas) {
      this.#gpuCanvas = createGraphics(1, 1, WEBGL);
    }
    return this.#gpuCanvas;
  }

  #ensureFramebuffers(width, height) {
    let gpuCanvas = this.#ensureGpuCanvas();
    if (!this.#fboA) {
      this.#fboA = gpuCanvas.createFramebuffer({ width, height, density: 1, antialias: false });
      this.#fboB = gpuCanvas.createFramebuffer({ width, height, density: 1, antialias: false });
    } else if (this.#fboA.width !== width || this.#fboA.height !== height) {
      this.#fboA.resize(width, height);
      this.#fboB.resize(width, height);
    }
    return [this.#fboA, this.#fboB];
  }

  // ---------- #compileGPU: the real JS-to-GLSL translation ----------
  // NOTE: reads shaderFunc.toString() and parses it as-is via Acorn.
  // Requires loop protection disabled in the editor (OpenProcessing:
  // sketch settings) — editor-injected instrumentation inside loop
  // bodies will break parsing, since #compileGPU assumes clean source.
  //
  // Shader functions may declare one of three signatures, detected via
  // shaderFunc.length (JS's own function arity - no separate schema
  // needed, same "implicit, no registration required" spirit as
  // color/x/y/image already had):
  //   5 params: (color, x, y, image, uniforms)                       - base
  //   7 params: (color, x, y, image, uniforms, imageW, imageH)       - + size
  //   8 params: (..., imageW, imageH, altImage)                      - + a second comparison image
  #compileGPU(shaderFunc, uniforms) {
    let source = shaderFunc.toString();
    let ast = acorn.parse(source, { ecmaVersion: 2020 });
    let funcNode = ast.body[0]; // the FunctionDeclaration

    let paramCount = shaderFunc.length;
    if (![5, 7, 8].includes(paramCount)) {
      throw new Error(
        `GPUCompile: shader function '${funcNode.id ? funcNode.id.name : '(anonymous)'}' must declare 5 params ` +
        `(color, x, y, image, uniforms), 7 (+ imageW, imageH), or 8 (+ altImage) - got ${paramCount}`
      );
    }
    let includeSize = paramCount >= 7;
    let includeAlt = paramCount === 8;

    let typeEnv = { color: 'vec4', x: 'float', y: 'float' }; // known parameter types
    if (includeSize) {
      typeEnv.imageW = 'float';
      typeEnv.imageH = 'float';
    }
    let bodyGLSL = funcNode.body.body.map(stmt => emitStatement(stmt, typeEnv)).join('\n');

    let glslParams = 'vec4 color, float x, float y, sampler2D image';
    if (includeSize) glslParams += ', float imageW, float imageH';
    if (includeAlt) glslParams += ', sampler2D altImage';
    let funcGLSL = `vec4 ${funcNode.id.name}(${glslParams}) {\n${bodyGLSL}\n}`;

    let uniformDecls = Object.keys(uniforms)
      .map(key => `uniform ${inferUniformType(uniforms[key])} ${key};`)
      .join('\n');

    // tex1 (the alt image) only gets declared when a filter actually asks
    // for it - no unused binding cluttering every other filter's shader.
    let altTexDecl = includeAlt ? 'uniform sampler2D tex1;' : '';

    let callArgs = 'srcColor, px, py, tex0';
    if (includeSize) callArgs += ', resolution.x, resolution.y'; // resolution already IS imageW/imageH
    if (includeAlt) callArgs += ', tex1';

    let fragSrc = `
      precision mediump float;
      varying vec2 vTexCoord;
      uniform sampler2D tex0;
      ${altTexDecl}
      uniform vec2 resolution;
      ${uniformDecls}

      ${funcGLSL}

      void main() {
        vec4 srcColor = texture2D(tex0, vTexCoord);
        float px = vTexCoord.x * resolution.x;
        float py = vTexCoord.y * resolution.y;
        gl_FragColor = ${funcNode.id.name}(${callArgs});
      }
    `;

    //console.log(`--- DFX compileGPU generated GLSL (${funcNode.id.name}) ---\n` + fragSrc);

    let gpuCanvas = this.#ensureGpuCanvas();
    let shader = gpuCanvas.createShader(DFX._vertexShaderSrc, fragSrc);
    return { shader, uniformTypes: uniformShape(uniforms) };
  }

  // Returns a compiled shader for shaderFunc, compiling (and caching) it
  // on first use. If the same shaderFunc is later called with a
  // differently-shaped uniforms object (different keys, or a key that
  // changed from e.g. a number to a vec2), that's a real problem - the
  // cached GLSL declares uniforms of the old shape - so this throws a
  // clear error rather than silently rendering with stale/mismatched
  // uniform declarations.
  #getCompiledShader(shaderFunc, uniforms) {
    let currentShape = uniformShape(uniforms);
    let cached = this.#shaderCache.get(shaderFunc);

    if (cached) {
      if (!shapesMatch(cached.uniformTypes, currentShape)) {
        throw new Error(
          `DFX: uniforms for '${shaderFunc.name || 'this filter'}' changed shape between calls ` +
          `(compiled as ${JSON.stringify(cached.uniformTypes)}, now called with ${JSON.stringify(currentShape)}). ` +
          `A given filter function is compiled once and cached - call it with the same uniform keys/types every time.`
        );
      }
      return cached.shader;
    }

    let { shader, uniformTypes } = this.#compileGPU(shaderFunc, uniforms);
    this.#shaderCache.set(shaderFunc, { shader, uniformTypes });
    return shader;
  }

  // Gives any image-like object a .sample(x, y) method, matching how the
  // main source image already works - used for both the primary image
  // and (when a filter declares one) the altImage. Coordinates are
  // clamped to the image edges and rounded to the nearest pixel (GLSL's
  // texture2D interpolates instead - a known, minor CPU/GPU difference at
  // edges).
  #attachSampleMethod(sourceImg) {
    sourceImg.loadPixels();
    let density = Math.round(Math.sqrt(sourceImg.pixels.length / (sourceImg.width * sourceImg.height * 4)));
    let stride = sourceImg.width * density;
    sourceImg.sample = function (sx, sy) {
      let cx = Math.min(Math.max(Math.round(sx), 0), sourceImg.width - 1);
      let cy = Math.min(Math.max(Math.round(sy), 0), sourceImg.height - 1);
      let sIdx = (cx * density + cy * density * stride) * 4;
      return new DFX.ColorVec(
        sourceImg.pixels[sIdx] / 255,
        sourceImg.pixels[sIdx + 1] / 255,
        sourceImg.pixels[sIdx + 2] / 255,
        sourceImg.pixels[sIdx + 3] / 255
      );
    };
  }

  // ---------- #runCPU: single-filter CPU runner ----------
  // filterEntry is { shaderFunc, uniforms, altImage? }. shaderFunc.length
  // (its own declared arity) decides how many of [inColor, x, y, img,
  // uniforms, img.width, img.height, altImage] it actually receives - see
  // #compileGPU's header comment for the three valid shapes.
  #runCPU(img, filterEntry) {
    let { shaderFunc, uniforms, altImage } = filterEntry;
    let paramCount = shaderFunc.length;

    // GLSL's sin/cos/tan always expect radians. p5's do not — they respect
    // angleMode(), which defaults to DEGREES. Force RADIANS for the duration
    // of the run so trig-using filters behave identically to their GPU
    // counterpart, then restore whatever the sketch had before.
    let previousAngleMode = angleMode();
    angleMode(RADIANS);

    try {
      img.loadPixels();

      // Derive the real pixel density from the data itself, rather than
      // assuming pixelDensity(1) took effect (it doesn't always, e.g. in
      // some online editors).
      let density = Math.round(Math.sqrt(img.pixels.length / (img.width * img.height * 4)));
      let sourceStride = img.width * density;

      let out = createImage(img.width, img.height); // output stays at logical size, density 1
      out.loadPixels();

      // Give the source image (and, if this filter uses one, the alt
      // image) a .sample(x, y) method so shaderFunc can read neighboring
      // pixels the same way it would via texture2D() on the GPU path.
      this.#attachSampleMethod(img);
      if (altImage) this.#attachSampleMethod(altImage);

      for (let y = 0; y < img.height; y++) {
        for (let x = 0; x < img.width; x++) {
          let sx = x * density;
          let sy = y * density;
          let idx = (sx + sy * sourceStride) * 4;

          let inColor = new DFX.ColorVec(
            img.pixels[idx] / 255,
            img.pixels[idx + 1] / 255,
            img.pixels[idx + 2] / 255,
            img.pixels[idx + 3] / 255
          );

          // Full arg list in the fixed convention order, trimmed to
          // however many params this shaderFunc actually declared.
          let allArgs = [inColor, x, y, img, uniforms, img.width, img.height, altImage];
          let outColor = shaderFunc(...allArgs.slice(0, paramCount));

          let outIdx = (x + y * img.width) * 4;
          out.pixels[outIdx] = outColor.r * 255;
          out.pixels[outIdx + 1] = outColor.g * 255;
          out.pixels[outIdx + 2] = outColor.b * 255;
          out.pixels[outIdx + 3] = outColor.a * 255;
        }
      }

      out.updatePixels();
      return out;
    } finally {
      angleMode(previousAngleMode); // restore, even if shaderFunc threw
    }
  }

  // Threads each filter's output into the next filter's input. A chain of
  // length 1 behaves identically to calling #runCPU directly.
  #runCPUChain(img, chain) {
    let current = img;
    for (let filterEntry of chain) {
      current = this.#runCPU(current, filterEntry);
    }
    return current;
  }

  // ---------- #runGPUChain: ping-pong through two framebuffers ----------
  // Each filter reads the previous step's output and writes into whichever
  // framebuffer isn't currently "src", alternating A/B/A/B... This keeps
  // every intermediate result on the GPU - no readback to CPU between
  // filters, only (optionally) after the very last one. A chain of length
  // 1 just uses fboA once.
  #runGPUChain(img, chain) {
    let gpuCanvas = this.#ensureGpuCanvas();
    let [fboA, fboB] = this.#ensureFramebuffers(img.width, img.height);
    let buffers = [fboA, fboB];

    let src = img;
    let outIndex = 0;

    for (let filterEntry of chain) {
      let compiledShader = this.#getCompiledShader(filterEntry.shaderFunc, filterEntry.uniforms);
      let outBuffer = buffers[outIndex];

      outBuffer.begin();
      gpuCanvas.shader(compiledShader);
      compiledShader.setUniform('tex0', src);
      compiledShader.setUniform('resolution', [img.width, img.height]);
      if (filterEntry.altImage) {
        compiledShader.setUniform('tex1', filterEntry.altImage);
      }
      for (let key in filterEntry.uniforms) {
        compiledShader.setUniform(key, filterEntry.uniforms[key]);
      }
      gpuCanvas.noStroke();
      gpuCanvas.rect(-img.width / 2, -img.height / 2, img.width, img.height); // WEBGL origin is centered
      outBuffer.end();

      src = outBuffer;
      outIndex = 1 - outIndex;
    }

    // Every filter above stayed entirely on the GPU (framebuffer -> next
    // filter's tex0 input, no CPU involvement) - that's the actual
    // performance win of chaining. This .get() is the ONE unavoidable
    // readback, at the very end, because p5's global image() can't
    // reliably draw a p5.Framebuffer that belongs to a secondary offscreen
    // WEBGL context (#gpuCanvas here) rather than the main canvas's own
    // renderer. Cost is the same single readback regardless of chain
    // length - 1 filter or 5, still exactly one .get() call.
    return src.get();
  }

  // ---------- run: the single public entry point ----------
  // filterOrChain is either one { shaderFunc, uniforms } object, or an
  // array of them applied in order. A single filter is normalized to a
  // chain of length 1 immediately, so there's exactly one code path from
  // here on - no separate single-filter/chain logic to keep in sync.
  run(img, filterOrChain, mode) {
    let chain = Array.isArray(filterOrChain) ? filterOrChain : [filterOrChain];

    if (chain.length === 0) {
      throw new Error('DFX: run() needs at least one filter - got an empty chain');
    }
    for (let entry of chain) {
      if (!entry || typeof entry.shaderFunc !== 'function') {
        throw new Error('DFX: each filter in the chain needs a shaderFunc (a plain function)');
      }
      if (!entry.uniforms || typeof entry.uniforms !== 'object') {
        throw new Error('DFX: each filter in the chain needs a uniforms object - use {} if it takes none');
      }

      let paramCount = entry.shaderFunc.length;
      let fnName = entry.shaderFunc.name || '(anonymous)';
      if (![5, 7, 8].includes(paramCount)) {
        throw new Error(
          `DFX: '${fnName}' must declare 5 params (color, x, y, image, uniforms), ` +
          `7 (+ imageW, imageH), or 8 (+ altImage) - got ${paramCount}`
        );
      }
      if (paramCount === 8 && !entry.altImage) {
        throw new Error(`DFX: '${fnName}' declares an altImage parameter, but no altImage was provided in its filter entry`);
      }
      if (paramCount !== 8 && entry.altImage) {
        throw new Error(`DFX: filter entry for '${fnName}' provided an altImage, but this shader function's signature doesn't accept one (needs 8 params, has ${paramCount})`);
      }
      if (entry.altImage && (entry.altImage.width !== img.width || entry.altImage.height !== img.height)) {
        throw new Error(
          `DFX: '${fnName}'s altImage is ${entry.altImage.width}x${entry.altImage.height}, ` +
          `but the source image is ${img.width}x${img.height} - altImage must match the source size.`
        );
      }
    }

    if (mode === 'CPU') return this.#runCPUChain(img, chain);
    if (mode === 'GPU') return this.#runGPUChain(img, chain);
    throw new Error(`DFX: unknown mode '${mode}' - expected "CPU" or "GPU"`);
  }
}