import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { onePerFrame } from "./onePerFrame";

let frames: FrameRequestCallback[] = [];

beforeEach(() => {
  frames = [];
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => frames.push(callback));
  vi.stubGlobal("cancelAnimationFrame", (id: number) => {
    frames[id - 1] = () => {};
  });
});

afterEach(() => vi.unstubAllGlobals());

function nextFrame() {
  const pending = frames;
  frames = [];
  for (const callback of pending) callback(0);
}

describe("onePerFrame", () => {
  it("aplica solo el ultimo valor de cada cuadro", () => {
    const applied: number[] = [];
    const throttled = onePerFrame((value: number) => applied.push(value));
    throttled.set(1);
    throttled.set(2);
    throttled.set(3);
    expect(applied).toEqual([]);
    nextFrame();
    expect(applied).toEqual([3]);
    throttled.set(4);
    nextFrame();
    expect(applied).toEqual([3, 4]);
  });

  it("flush aplica lo pendiente ya y no lo repite en el cuadro", () => {
    const applied: number[] = [];
    const throttled = onePerFrame((value: number) => applied.push(value));
    throttled.set(7);
    throttled.flush();
    expect(applied).toEqual([7]);
    nextFrame();
    expect(applied).toEqual([7]);
  });

  it("flush sin nada pendiente no hace nada", () => {
    const applied: number[] = [];
    onePerFrame((value: number) => applied.push(value)).flush();
    expect(applied).toEqual([]);
  });

  it("cancel descarta lo pendiente", () => {
    const applied: number[] = [];
    const throttled = onePerFrame((value: number) => applied.push(value));
    throttled.set(1);
    throttled.cancel();
    nextFrame();
    expect(applied).toEqual([]);
  });
});
