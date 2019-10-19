precision highp float;

uniform float u_subpixel;
uniform float u_pixel;
uniform int u_rtx;
uniform int u_tick;

uniform vec4 u_color;
uniform vec4 u_strokeColor;
uniform vec2 u_hexSizing;
uniform float u_hexMask;

varying vec2 v_draw;
varying vec2 v_rel;
varying vec2 v_range;

#define HexTopProportion 0.577	
#define HexHalfProportion (HexTopProportion / 2.0)	
#define Hex1 (0.5 - HexHalfProportion)	

// Vertical hexagons - pointy end at the top
float isHexEdge(vec2 p, vec2 hexSize) {
	float hexRowSize = 2.0 * u_pixel * hexSize.y; // Two quads per hex down so that it tesselates
	float row = mod(p.y, hexRowSize) / (hexRowSize);

	float hexColSize = u_pixel * hexSize.x; // One squad per hex across so that it tesselates
	float col = mod(p.x, hexColSize) / (hexColSize);

	float halfCol = 1.0 - 2.0 * abs(col - 0.5); // 0.0 (side col) - 1.0 (middle col)
	float hexRow1 = mix(Hex1 / 2.0, -Hex1 / 2.0, halfCol);
	float hexRow2 = mix((1.0 - Hex1) / 2.0, (1.0 + Hex1) / 2.0, halfCol);

	float rowDist = abs(row - hexRow1); // Check against first
	rowDist = min(rowDist, abs(row - (hexRow1 + 1.0))); // Check against first wrapped
	rowDist = min(rowDist, abs(row - hexRow2)); // Check against second

	float result = 0.0;
	result = max(result, smoothstep(u_pixel, 0.0, rowDist * hexRowSize));

	float col1Dist = abs(col);
	if (col1Dist * hexColSize <= u_subpixel) {
		if (hexRow1 <= row && row <= hexRow2) {
			result = max(result, smoothstep(u_pixel, 0.0, col1Dist * hexColSize));
		}
	}

	float col2Dist = abs(col - 0.5);
	if (col2Dist * hexColSize <= u_subpixel) {
		if (hexRow2 <= row && row <= (hexRow1 + 1.0)) {
			result = max(result, smoothstep(u_pixel, 0.0, col2Dist * hexColSize));
		}
	}	

	return result;
}

void main() {
	vec4 color = vec4(u_color);

	vec4 strokeColor = u_strokeColor;
	float strokeRange = v_range[0];
	float fillRange = v_range[1];

	float radius = length(v_rel);

	if (radius > fillRange) {
		float outside = radius - fillRange;

		// Smooth
		float alpha = smoothstep(0.0, u_subpixel, outside);
		color = mix(color, strokeColor, alpha);
	} else {
		float hexEdge = isHexEdge(v_draw, u_hexSizing);
		if (hexEdge > 0.0) {
			color = mix(color, color * u_hexMask, hexEdge);
		}
	}

	if (radius > strokeRange) {
		float outside = radius - strokeRange;

		// Antialias
		float fade = 1.0 - smoothstep(0.0, u_pixel, outside);
		color.w *= fade;

		if (fade == 0.0) {
			discard;
		}
	}

	gl_FragColor = color;
}
