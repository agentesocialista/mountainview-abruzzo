import { describe, expect, it } from "vitest";
import { parseFavoriteIds, serializeFavoriteIds } from "./favorites";

describe("parseFavoriteIds", () => {
  it("restituisce un insieme vuoto per dati assenti o malformati", () => {
    expect([...parseFavoriteIds(null)]).toEqual([]);
    expect([...parseFavoriteIds("")]).toEqual([]);
    expect([...parseFavoriteIds("{non-json")]).toEqual([]);
    expect([...parseFavoriteIds('{"id":"peak-corno-grande"}')]).toEqual([]);
  });

  it("mantiene solo gli ID validi e rimuove i duplicati", () => {
    const ids = parseFavoriteIds(
      JSON.stringify(["peak-corno-grande", 42, "", "peak-corno-grande", "hut-1"]),
    );
    expect([...ids]).toEqual(["peak-corno-grande", "hut-1"]);
  });
});

describe("serializeFavoriteIds", () => {
  it("fa un round-trip con parseFavoriteIds", () => {
    const original = ["webcam-a1", "peak-corno-grande"];
    const restored = parseFavoriteIds(serializeFavoriteIds(original));
    expect([...restored]).toEqual(original);
  });
});
