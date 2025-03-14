import seedrandom from "seedrandom";
import { describe, expect, test } from "vitest";
import { genCodeSync, primaryGraph, variable } from "../../engine/Autodiff.js";
import { Circle, makeCircle } from "../../shapes/Circle.js";
import { Ellipse, makeEllipse } from "../../shapes/Ellipse.js";
import { Line, makeLine } from "../../shapes/Line.js";
import { Polygon, makePolygon } from "../../shapes/Polygon.js";
import { Polyline } from "../../shapes/Polyline.js";
import { makeRectangle } from "../../shapes/Rectangle.js";
import { Context, InputFactory, makeCanvas } from "../../shapes/Samplers.js";
import * as ad from "../../types/ad.js";
import { FloatV } from "../../types/value.js";
import { black, floatV, ptListV, vectorV } from "../../utils/Util.js";
import { compDict, signedDistanceEllipse } from "../Functions.js";
import { Rectlike, toPt } from "../Utils.js";

const canvas = makeCanvas(800, 700);

export const makeContext = (
  pt: number[],
): { context: Context; p: ad.Var[] } => {
  const rng = seedrandom("sdf");
  const inputs: ad.Var[] = [];
  const makeInput: InputFactory = (meta) => {
    const x = variable(
      meta.init.tag === "Sampled" ? meta.init.sampler(rng) : meta.init.pending,
    );
    inputs.push(x);
    return x;
  };
  for (const coord of pt) {
    makeInput({
      init: { tag: "Sampled", sampler: () => coord },
      stages: new Set(),
    });
  }
  return { context: { makeInput }, p: [...inputs] };
};

const compareDistance = (
  context: Context,
  shapeType: string,
  shape:
    | Ellipse<ad.Num>
    | Polyline<ad.Num>
    | Polygon<ad.Num>
    | Line<ad.Num>
    | Circle<ad.Num>
    | Rectlike<ad.Num>,
  p: ad.Var[],
  expected: number,
) => {
  const result = getResult(context, shape, p);
  const g = primaryGraph(result.contents);
  //const g = secondaryGraph([result.contents]);
  const f = genCodeSync(g);
  /* const [dist] = 
  const {
    secondary: [dist],
    stmts,
  } = f([]); // no inputs, so, empty array
  const code = stmts.join("\n");
  console.log(code); */
  const { primary: dist, gradient } = f((x) => x.val);
  //TODO: debug gradient for ellipse
  // the commented code in the next three lines is useful for debugging
  // gradients
  //const newfun = (xs: number[]) => f(xs).primary;
  //const foo = _gradFiniteDiff(newfun)([p[0].val, p[1].val]);
  //console.log("symbolic gradient", gradient, "computed gradient:", foo);
  expect(dist).toBeCloseTo(expected);
};

const getResult = (
  context: Context,
  s:
    | Ellipse<ad.Num>
    | Polyline<ad.Num>
    | Polygon<ad.Num>
    | Line<ad.Num>
    | Circle<ad.Num>
    | Rectlike<ad.Num>,
  p: ad.Var[],
): FloatV<ad.Num> => {
  if (s.shapeType === "Ellipse") {
    return {
      tag: "FloatV",
      contents: signedDistanceEllipse(
        toPt(s.center.contents),
        s.rx.contents,
        s.ry.contents,
        toPt(p),
      ),
    };
  } else {
    const result = compDict.signedDistance.body(context, s, [p[0], p[1]]).value;
    if (result.tag === "FloatV") {
      return result;
    } else {
      return floatV(0);
    }
  }
};

const testRectangle = (
  center: number[],
  width: number,
  height: number,
  strokeWidth: number,
  pt: number[],
  expected: number,
) => {
  const { context, p } = makeContext(pt);
  const shape = makeRectangle(context, canvas, {
    center: vectorV(center),
    width: floatV(width),
    height: floatV(height),
    strokeWidth: floatV(strokeWidth),
    strokeColor: black(),
  });
  compareDistance(context, "Rectangle", shape, p, expected);
};

const testCircle = (
  center: number[],
  radius: number,
  strokeWidth: number,
  pt: number[],
  expected: number,
) => {
  const { context, p } = makeContext(pt);
  const shape = makeCircle(context, canvas, {
    center: vectorV(center),
    r: floatV(radius),
    strokeWidth: floatV(strokeWidth),
    strokeColor: black(),
  });
  compareDistance(context, "Circle", shape, p, expected);
};

const testPolygon = (
  points: number[][],
  strokeWidth: number,
  pt: number[],
  expected: number,
) => {
  const { context, p } = makeContext(pt);
  const shape = makePolygon(context, canvas, {
    strokeWidth: floatV(strokeWidth),
    strokeColor: black(),
    points: ptListV(points),
  });
  compareDistance(context, "Polygon", shape, p, expected);
};

function testLine(
  start: number[],
  end: number[],
  strokeWidth: number,
  pt: number[],
  expected: number,
) {
  const { context, p } = makeContext(pt);
  const shape = makeLine(context, canvas, {
    strokeWidth: floatV(strokeWidth),
    strokeColor: black(),
    start: vectorV(start),
    end: vectorV(end),
  });
  compareDistance(context, "Line", shape, p, expected);
}

function testEllipse(
  center: number[],
  rx: number,
  ry: number,
  pt: number[],
  expected: number,
) {
  const { context, p } = makeContext(pt);
  const shape = makeEllipse(context, canvas, {
    center: vectorV(center),
    rx: floatV(rx),
    ry: floatV(ry),
    strokeColor: black(),
  });
  compareDistance(context, "Ellipse", shape, p, expected);
}

describe("sdf", () => {
  test("centered rectange", () => {
    testRectangle([0, 0], 8, 4, 0, [5, 0], 1);
    testRectangle([0, 0], 8, 4, 0, [0, 3], 1);
    testRectangle([0, 0], 8, 4, 0, [0, 1], -1);
    testRectangle([0, 0], 8, 4, 0, [3, 0], -1);
    testRectangle([0, 0], 8, 4, 0, [-3, 0], -1);
    testRectangle([0, 0], 8, 4, 0, [7, 6], 5);
    testRectangle([0, 0], 8, 4, 0, [7, -6], 5);
    testRectangle([0, 0], 8, 4, 0, [-7, -6], 5);
    testRectangle([0, 0], 8, 4, 0, [-7, 6], 5);
    testRectangle([0, 0], 8, 4, 0, [-6, 0], 2);
    testRectangle([0, 0], 8, 4, 0, [0, 6], 4);
    testRectangle([0, 0], 8, 4, 0, [0, -6], 4);
    testRectangle([0, 0], 8, 4, 0, [0, 0], -2);
    testRectangle([0, 0], 8, 4, 0, [4, 2], 0);
    testRectangle([0, 0], 8, 4, 0, [0, 2], 0);
  });

  test("off-center square", () => {
    testRectangle([-2, -2], 4, 4, 0, [0, 0], 0);
    testRectangle([-2, -2], 4, 4, 0, [-2, -2], -2);
    testRectangle([-2, -2], 4, 4, 0, [-1, -2], -1);
  });

  test("circle", () => {
    testCircle([0, 0], 3, 0, [0, 0], -3);
    testCircle([0, 0], 3, 0, [3, 0], 0);
    testCircle([0, 0], 3, 0, [4, 0], 1);
    testCircle([0, 0], 3, 0, [-5, 0], 2);
  });

  test("offset circle", () => {
    testCircle([3, 3], 3, 0, [3, 3], -3);
    testCircle([3, 3], 3, 0, [3, 6], 0);
    testCircle([3, 3], 3, 0, [3, 0], 0);
  });

  test("rectangle as polygon", () => {
    testPolygon(
      [
        [4, 2],
        [4, -2],
        [-4, -2],
        [-4, 2],
      ],
      0,
      [5, 0],
      1,
    );
    testPolygon(
      [
        [4, 2],
        [4, -2],
        [-4, -2],
        [-4, 2],
      ],
      0,
      [0, 2],
      0,
    );
  });
  testPolygon(
    [
      [-4, -4],
      [-4, 0],
      [0, 0],
      [0, -4],
    ],
    0,
    [-2, -2],
    -2,
  );

  test("convex heptagon", () => {
    testPolygon(
      [
        [4, 8],
        [8, 8],
        [8, 0],
        [0, 0],
        [0, 4],
        [4, 4],
      ],
      0,
      [3, 6],
      1,
    );
  });

  test("line", () => {
    testLine([0, 0], [8, 0], 0, [4, 0], 0);
    testLine([0, 0], [8, 0], 0, [0, 4], 4);
    testLine([0, 0], [8, 8], 0, [0, 4], Math.cos(Math.PI / 4) * 4);
  });

  test("ellipse", () => {
    testEllipse([0, 0], 100, 50, [0, 60], 10);
    testEllipse([0, 0], 100, 50, [0, 0], -50);
    testEllipse([0, 0], 100, 50, [0, 10], -40);
    testEllipse([0, 0], 100, 50, [0, -50], 0);
    testEllipse([0, 0], 50, 100, [0, -100], 0);
    testEllipse([0, 0], 100, 50, [0, 110], 60);
    testEllipse([0, 0], 100, 50, [200, 200], 208.06713155931837);
    testEllipse([0, 0], 100, 50, [100, 100], 70.94005207582373);
    testEllipse([0, 0], 50, 100, [10, 10], -39.68665679900546);
    testEllipse([0, 0], 50, 100, [-10, -15], -39.292580918351725);
    testEllipse([0, 0], 50, 100, [-10, -15], -39.292580918351725);
    testEllipse([0, 0], 50, 100, [20, -30], -27.29927445733961);
    testEllipse([0, 0], 50, 100, [10, -30], -37.1165176575388);
    testEllipse([0, 0], 50, 100, [35, -30], -12.53117223937538);
    testEllipse([0, 0], 100, 50, [200, 0], 100);
    testEllipse([0, 0], 50, 100, [-60, 10], 10.238345931161755);
    testEllipse([0, 0], 50, 100, [-40, 10], -9.736448344260499);
    testEllipse([0, 0], 50, 100, [80, -30], 31.969826845944244);
    testEllipse([0, 0], 100, 50, [100, 0], 0);
  });
});
