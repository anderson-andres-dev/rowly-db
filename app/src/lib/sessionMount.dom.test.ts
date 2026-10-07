// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { sessionMount } from "./sessionMount";

afterEach(() => document.body.replaceChildren());

it("mueve una sesion entre grupos conservando su DOM, buffer y eventos", () => {
  const first = document.createElement("div");
  const second = document.createElement("div");
  const session = document.createElement("div");
  const input = document.createElement("textarea");
  input.value = "salida del shell";
  const onInput = vi.fn();
  input.addEventListener("input", onInput);
  session.append(input);
  document.body.append(first, second, session);
  const mount = sessionMount(session, first);
  mount.update(second);
  first.remove();
  expect(second.firstChild).toBe(session);
  expect(session.firstChild).toBe(input);
  expect(input.value).toBe("salida del shell");
  input.dispatchEvent(new Event("input"));
  expect(onInput).toHaveBeenCalledOnce();
  mount.destroy();
  expect(session.isConnected).toBe(false);
});

it("espera al nuevo contenedor y no vuelve a insertar una sesion ya ubicada", () => {
  const session = document.createElement("div");
  const target = document.createElement("div");
  document.body.append(session, target);
  const mount = sessionMount(session, undefined);
  mount.update(target);
  const append = vi.spyOn(target, "appendChild");
  mount.update(target);
  mount.update(undefined);
  expect(append).not.toHaveBeenCalled();
  expect(session.parentElement).toBe(target);
  mount.destroy();
});
