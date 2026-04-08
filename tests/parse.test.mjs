import test from "node:test";
import assert from "node:assert/strict";
import { parseObservations } from "../parse.js";

function eq(actual, expectedItems, expectedInvalid) {
  assert.deepEqual(actual.items, expectedItems);
  assert.deepEqual(actual.invalidTokens, expectedInvalid);
}

const twoSpecies = [
  { species: "スズメ", count: 2 },
  { species: "ハト", count: 7 }
];

test("N-01", () => {
  eq(parseObservations("スズメ3"), [{ species: "スズメ", count: 3 }], []);
});

test("N-02", () => {
  eq(parseObservations("スズメ 3"), [{ species: "スズメ", count: 3 }], []);
});

test("N-03", () => {
  eq(parseObservations("スズメ２"), [{ species: "スズメ", count: 2 }], []);
});

test("N-04", () => {
  eq(parseObservations("スズメ2、ハト7"), twoSpecies, []);
});

test("N-05", () => {
  eq(parseObservations("スズメ2,ハト7"), twoSpecies, []);
});

test("N-06", () => {
  eq(parseObservations("スズメ2 ハト7"), twoSpecies, []);
});

test("N-07", () => {
  eq(parseObservations("スズメ2\nハト7"), twoSpecies, []);
});

test("N-08", () => {
  eq(
    parseObservations("スズメ,ハト"),
    [
      { species: "スズメ", count: 1 },
      { species: "ハト", count: 1 }
    ],
    []
  );
});

test("数省略・単独（スズメのみ）", () => {
  eq(parseObservations("スズメ"), [{ species: "スズメ", count: 1 }], []);
});

test("数省略・全角スペース区切り", () => {
  eq(
    parseObservations("スズメ\u3000ハト"),
    [
      { species: "スズメ", count: 1 },
      { species: "ハト", count: 1 }
    ],
    []
  );
});

test("E-01", () => {
  eq(parseObservations("すずめ3"), [], ["すずめ3"]);
});

test("E-02", () => {
  eq(parseObservations("雀3"), [], ["雀3"]);
});

test("E-03", () => {
  eq(parseObservations("スズメ0"), [], ["スズメ0"]);
});

test("E-04", () => {
  eq(parseObservations("スズメ-1"), [], ["スズメ-1"]);
});

test("E-05", () => {
  eq(parseObservations("スズメ1000"), [], ["スズメ1000"]);
});

test("E-06", () => {
  eq(parseObservations(""), [], []);
});

test("B-01", () => {
  eq(parseObservations("スズメ1、"), [{ species: "スズメ", count: 1 }], []);
});

test("B-02", () => {
  eq(parseObservations("、スズメ1"), [{ species: "スズメ", count: 1 }], []);
});

test("B-03", () => {
  eq(
    parseObservations("  スズメ1  ハト2  "),
    [
      { species: "スズメ", count: 1 },
      { species: "ハト", count: 2 }
    ],
    []
  );
});

test("B-04", () => {
  eq(
    parseObservations("スズメ１ハト２"),
    [
      { species: "スズメ", count: 1 },
      { species: "ハト", count: 2 }
    ],
    []
  );
});
