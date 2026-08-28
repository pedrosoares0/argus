'use client'

import React, { useEffect, useRef, useState } from 'react'
import { SHADER_SOURCE } from './orbIAShader'

interface OrbIAProps {
  tamanho?: number
  className?: string
}

const UNIFORM_SEED = [
  1, 1, 0, 2.2200000286102295, 0.9399999976158142, 0.4399999976158142,
  2.3499999046325684, 0.3400000035762787, 0.5, 0.4000000059604645,
  0.6600000262260437, 0.7599999904632568, 0.5, 0.20999999344348907,
  1, 15, 0.014999999664723873, 0.10999999940395355, 0, 1, 1, 0, 2,
  0.41999998688697815, 0.7699999809265137, 0.23000000417232513, 65, 0, 0, 1,
  0.2199999988079071, 0.25, 0.9686274528503418, 0.9843137264251709, 1, 1,
  0.8392156958580017, 0.9098039269447327, 0.9686274528503418, 1,
  0.6666666865348816, 0.7843137383460999, 0.9333333373069763, 1,
  0.22745098173618317, 0.48627451062202454, 0.8941176533699036, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 0.7176470756530762, 0.8392156958580017,
  0.9411764740943909, 1, 0.2705882489681244, 0.5098039507865906,
  0.8901960849761963, 1, 0.9176470637321472, 0.95686274766922, 1, 1,
  0.8627451062202454, 0.9176470637321472, 1, 1, 0, 0, 0, 1,
  0.3764705955982208, 0.5803921818733215, 0.9019607901573181, 1,
  0.9686274528503418, 0.9843137264251709, 1, 1, 0.9372549057006836,
  0.9647058844566345, 0.9921568632125854, 1, 0.8784313797950745,
  0.9333333373069763, 0.9764705896377563, 1, 0.8313725590705872,
  0.9019607901573181, 0.9686274528503418, 1, 0.7333333492279053,
  0.8352941274642944, 0.9529411792755127, 1, 0.6509804129600525,
  0.7803921699523926, 0.9411764740943909, 1, 0.529411792755127,
  0.6901960968971252, 0.9215686321258545, 1, 0.43529412150382996,
  0.6196078658103943, 0.9098039269447327, 1, 0.43529412150382996,
  0.6196078658103943, 0.9098039269447327, 1, 0.43529412150382996,
  0.6196078658103943, 0.9098039269447327, 1, 0.43529412150382996,
  0.6196078658103943, 0.9098039269447327, 1, 0.43529412150382996,
  0.6196078658103943, 0.9098039269447327, 1,
]

// WebGL Fallback Shader mirroring the Glass Liquid Frost Shader
const WEBGL_VERT = `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`

const WEBGL_FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  vec2 p = (uv - vec2(0.5)) * 2.0;
  float dist = length(p);

  if (dist > 1.0) {
    gl_FragColor = vec4(0.0);
    return;
  }

  float t = u_time * 0.45;
  vec2 drift = vec2(sin(t * 0.4) * 0.4, cos(t * 0.35) * 0.4);
  vec2 q = p * 1.35 + drift;
  
  float warp = fbm(q * 1.2 + vec2(t * 0.1, -t * 0.08));
  vec2 warpedP = q + (vec2(warp) - 0.5) * 0.45;
  
  float body = fbm(warpedP * 1.5 + vec2(t * 0.05, 0.0));
  float veins = pow(clamp(1.0 - abs(fbm(warpedP * 2.5 + vec2(2.5, -t * 0.04)) * 2.0 - 1.0), 0.0, 1.0), 0.85);
  
  float fluid = mix(smoothstep(0.1, 0.9, body), veins * 0.7 + body * 0.4, 0.34);

  // Paleta Frost Glass — Tons celeste, safira, luz suave e casca de vidro
  vec3 stop0 = vec3(0.96, 0.98, 1.0);
  vec3 stop1 = vec3(0.83, 0.90, 0.96);
  vec3 stop2 = vec3(0.66, 0.78, 0.93);
  vec3 stop3 = vec3(0.22, 0.48, 0.89);

  vec3 col = mix(stop0, stop1, smoothstep(0.0, 0.45, fluid));
  col = mix(col, stop2, smoothstep(0.38, 0.72, fluid));
  col = mix(col, stop3, smoothstep(0.68, 1.0, fluid));

  // Efeito lente de vidro (refração de borda e brilho perimetral)
  float edgeDepth = max(1.0 - dist, 0.0);
  float rim = pow(1.0 - smoothstep(0.0, 0.08, edgeDepth), 1.8);
  col = mix(col, vec3(1.0), rim * 0.4);

  float antialias = smoothstep(1.0, 0.97, dist);
  gl_FragColor = vec4(col * antialias, antialias);
}
`

export function OrbIA({ tamanho = 36, className = '' }: OrbIAProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let animationFrame = 0
    let stopped = false
    let webgpuDevice: any = null
    let webglCtx: WebGLRenderingContext | null = null

    const nav = typeof navigator !== 'undefined' ? (navigator as any) : null

    async function initWebGPU(): Promise<boolean> {
      if (!nav?.gpu) return false

      try {
        const adapter = await nav.gpu.requestAdapter()
        if (!adapter || stopped) return false

        const device = await adapter.requestDevice()
        if (stopped) {
          device.destroy()
          return false
        }
        webgpuDevice = device

        const context = (canvas as any).getContext('webgpu')
        if (!context) return false

        const format = nav.gpu.getPreferredCanvasFormat()
        context.configure({ device, format, alphaMode: 'premultiplied' })

        const shader = device.createShaderModule({ code: SHADER_SOURCE })
        const compilation = await shader.getCompilationInfo()
        const errors = compilation.messages.filter((m: any) => m.type === 'error')
        if (errors.length) return false

        const pipeline = device.createRenderPipeline({
          layout: 'auto',
          vertex: { module: shader, entryPoint: 'vs_main' },
          fragment: { module: shader, entryPoint: 'fs_main', targets: [{ format }] },
          primitive: { topology: 'triangle-list' },
        })

        const values = new Float32Array(UNIFORM_SEED)
        const bufferUsage = typeof (window as any).GPUBufferUsage !== 'undefined'
          ? (window as any).GPUBufferUsage.UNIFORM | (window as any).GPUBufferUsage.COPY_DST
          : 72

        const uniformBuffer = device.createBuffer({
          size: values.byteLength,
          usage: bufferUsage,
        })

        const bindGroup = device.createBindGroup({
          layout: pipeline.getBindGroupLayout(0),
          entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
        })

        const startedAt = performance.now()

        device.lost?.then(() => {
          if (!stopped) initWebGLFallback()
        })

        function frame(now: number) {
          if (stopped || !canvas) return
          try {
            const dpr = Math.min(window.devicePixelRatio || 1, 2)
            const width = Math.max(1, Math.floor((canvas.clientWidth || tamanho) * dpr))
            const height = Math.max(1, Math.floor((canvas.clientHeight || tamanho) * dpr))

            if (canvas.width !== width || canvas.height !== height) {
              canvas.width = width
              canvas.height = height
            }

            values[0] = width
            values[1] = height
            values[2] = (now - startedAt) / 1000
            device.queue.writeBuffer(uniformBuffer, 0, values)

            const encoder = device.createCommandEncoder()
            const pass = encoder.beginRenderPass({
              colorAttachments: [
                {
                  view: context.getCurrentTexture().createView(),
                  clearValue: { r: 0, g: 0, b: 0, a: 0 },
                  loadOp: 'clear',
                  storeOp: 'store',
                },
              ],
            })
            pass.setPipeline(pipeline)
            pass.setBindGroup(0, bindGroup)
            pass.draw(3)
            pass.end()
            device.queue.submit([encoder.finish()])

            animationFrame = requestAnimationFrame(frame)
          } catch {
            initWebGLFallback()
          }
        }

        animationFrame = requestAnimationFrame(frame)
        return true
      } catch {
        return false
      }
    }

    function initWebGLFallback() {
      if (stopped || !canvas) return
      try {
        const gl = canvas.getContext('webgl', { antialias: true, alpha: true })
        if (!gl) return
        webglCtx = gl

        const compile = (type: number, src: string) => {
          const s = gl.createShader(type)
          if (!s) return null
          gl.shaderSource(s, src)
          gl.compileShader(s)
          return s
        }

        const vert = compile(gl.VERTEX_SHADER, WEBGL_VERT)
        const frag = compile(gl.FRAGMENT_SHADER, WEBGL_FRAG)
        if (!vert || !frag) return

        const program = gl.createProgram()
        if (!program) return
        gl.attachShader(program, vert)
        gl.attachShader(program, frag)
        gl.linkProgram(program)
        gl.useProgram(program)

        const buffer = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
          gl.STATIC_DRAW,
        )
        const aPos = gl.getAttribLocation(program, 'a_pos')
        gl.enableVertexAttribArray(aPos)
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

        const uResolution = gl.getUniformLocation(program, 'u_resolution')
        const uTime = gl.getUniformLocation(program, 'u_time')

        const startedAt = performance.now()

        function webglFrame(now: number) {
          if (stopped || !canvas || !gl) return
          const dpr = Math.min(window.devicePixelRatio || 1, 2)
          const px = Math.round(tamanho * dpr)
          if (canvas.width !== px || canvas.height !== px) {
            canvas.width = px
            canvas.height = px
          }
          gl.viewport(0, 0, px, px)
          gl.uniform2f(uResolution, px, px)
          gl.uniform1f(uTime, (now - startedAt) / 1000)
          gl.drawArrays(gl.TRIANGLES, 0, 6)
          animationFrame = requestAnimationFrame(webglFrame)
        }

        animationFrame = requestAnimationFrame(webglFrame)
      } catch (err) {
        console.error('WebGL fallback error:', err)
      }
    }

    async function start() {
      const gpuSuccess = await initWebGPU()
      if (!gpuSuccess) {
        initWebGLFallback()
      }
    }

    start()

    return () => {
      stopped = true
      cancelAnimationFrame(animationFrame)
      webgpuDevice?.destroy()
    }
  }, [tamanho])

  return (
    <div
      className={`relative rounded-full overflow-hidden flex items-center justify-center shrink-0 select-none pointer-events-none ${className}`}
      style={{
        width: tamanho,
        height: tamanho,
      }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ width: tamanho, height: tamanho }}
      />
    </div>
  )
}

export default OrbIA
