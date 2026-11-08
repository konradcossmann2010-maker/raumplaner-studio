import { it, expect } from "vitest";
import { flushLatest } from "../src/persistence";
it("persists edits made while navigation is awaiting an earlier save", async () => {
  let current = "first",
    saved = "";
  const seen: string[] = [];
  await flushLatest(
    () => current,
    () => saved,
    async (snapshot) => {
      seen.push(snapshot);
      if (snapshot === "first") current = "edited-during-save";
      saved = snapshot;
    },
  );
  expect(seen).toEqual(["first", "edited-during-save"]);
  expect(saved).toBe(current);
});
