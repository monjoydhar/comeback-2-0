import assert from "node:assert/strict";
import { completionFromStatuses, dayTypeFromSchedule, statusFromNumericValue } from "./engine";

const counts = completionFromStatuses(["COMPLETED", "COMPLETED", "PARTIAL", "PARTIAL", "NOT_APPLICABLE", "MISSED"]);
assert.equal(counts.applicableTasks, 5);
assert.equal(counts.completedTasks, 2);
assert.equal(counts.partialTasks, 2);
assert.equal(counts.missedTasks, 1);
assert.equal(counts.completionPercent, 60);

assert.equal(statusFromNumericValue(2500, 2500), "COMPLETED");
assert.equal(statusFromNumericValue(1250, 2500), "PARTIAL");
assert.equal(statusFromNumericValue(0, 2500), "MISSED");

assert.equal(dayTypeFromSchedule({ SUNDAY: "Full Rest" }, "SUNDAY"), "FULL_REST");
assert.equal(dayTypeFromSchedule({ TUESDAY: "Rest" }, "TUESDAY"), "REST");
assert.equal(dayTypeFromSchedule({ MONDAY: "Strength A" }, "MONDAY"), "TRAINING");

console.log("Daily engine tests passed.");
