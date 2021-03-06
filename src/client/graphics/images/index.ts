import * as pl from 'planck-js';
import * as r from '../render.model';
import * as shaders from '../shaders';
import * as vector from '../../../game/vector';
import { Float32List } from '../list';

const imageFragmentShader = require('./image.fragment.glsl');
const imageVertexShader = require('./image.vertex.glsl');

export function initData(): r.DrawImagesData {
    return {
        uniforms: {
			u_texture: [r.Texture.Text],
        },
        attribs: {
            a_pos: new Float32List(),
            a_texCoord: new Float32List(),
        },
        numVertices: 0,
    };
}

export function clearData(data: r.DrawData) {
	for (const key in data.attribs) {
		data.attribs[key].clear();
	}

	data.numVertices = 0;
}

export function initImages(gl: WebGLRenderingContext): r.DrawImages {
	const program = shaders.compileProgram(gl, imageVertexShader, imageFragmentShader);
	return {
		program,
		uniforms: {
			...shaders.commonUniforms(gl, program),
			u_texture: {
				loc: gl.getUniformLocation(program, "u_texture"),
				type: gl.INT,
				size: 1,
			},
		},
		attribs: {
			a_pos: {
				loc: gl.getAttribLocation(program, "a_pos"),
				buffer: gl.createBuffer(),
				type: gl.FLOAT,
				size: 2,
			},
			a_texCoord: {
				loc: gl.getAttribLocation(program, "a_texCoord"),
				buffer: gl.createBuffer(),
				type: gl.FLOAT,
				size: 2,
			},
		},
	};
}

function appendPoint(ctxStack: r.CanvasCtxStack, pos: pl.Vec2, texCoord: pl.Vec2) {
    const images = shaders.getContext(ctxStack.gl).data.images;
	shaders.appendVec2(images.attribs.a_pos, pos);
	shaders.appendVec2(images.attribs.a_texCoord, texCoord);
	++images.numVertices;
}

export function image(ctxStack: r.CanvasCtxStack, drawRect: ClientRect, texRect: ClientRect) {
    // Top left triangle
    appendPoint(ctxStack, pl.Vec2(drawRect.left, drawRect.top), pl.Vec2(texRect.left, texRect.top));
    appendPoint(ctxStack, pl.Vec2(drawRect.right, drawRect.top), pl.Vec2(texRect.right, texRect.top));
    appendPoint(ctxStack, pl.Vec2(drawRect.left, drawRect.bottom), pl.Vec2(texRect.left, texRect.bottom));

    // Bottom right triangle
    appendPoint(ctxStack, pl.Vec2(drawRect.left, drawRect.bottom), pl.Vec2(texRect.left, texRect.bottom));
    appendPoint(ctxStack, pl.Vec2(drawRect.right, drawRect.top), pl.Vec2(texRect.right, texRect.top));
    appendPoint(ctxStack, pl.Vec2(drawRect.right, drawRect.bottom), pl.Vec2(texRect.right, texRect.bottom));
}