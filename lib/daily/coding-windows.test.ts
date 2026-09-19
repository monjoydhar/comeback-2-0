import {
  isWithinCodingWindow,
} from "./coding-windows";

const TIMEZONE = "Asia/Dhaka";
const DATE = "2026-09-20";

function assert(
  condition: boolean,
  message: string,
) {
  if (!condition) {
    throw new Error(`TEST FAILED: ${message}`);
  }
}

function utc(
  iso: string,
) {
  return new Date(iso);
}

console.log("Testing coding block windows...");

// Coding Block 1: 09:00–13:00
assert(
  isWithinCodingWindow({
    type: "CODING_BLOCK_1",
    localDate: DATE,
    timezone: TIMEZONE,
    now: utc("2026-09-20T03:00:00.000Z"),
  }),
  "09:00 Bangladesh time should be valid for Block 1",
);

assert(
  isWithinCodingWindow({
    type: "CODING_BLOCK_1",
    localDate: DATE,
    timezone: TIMEZONE,
    now: utc("2026-09-20T06:59:59.000Z"),
  }),
  "12:59:59 Bangladesh time should be valid for Block 1",
);

assert(
  !isWithinCodingWindow({
    type: "CODING_BLOCK_1",
    localDate: DATE,
    timezone: TIMEZONE,
    now: utc("2026-09-20T02:59:59.000Z"),
  }),
  "08:59:59 Bangladesh time should be invalid for Block 1",
);

assert(
  !isWithinCodingWindow({
    type: "CODING_BLOCK_1",
    localDate: DATE,
    timezone: TIMEZONE,
    now: utc("2026-09-20T07:00:01.000Z"),
  }),
  "13:00:01 Bangladesh time should be invalid for Block 1",
);

// Coding Block 2: 14:00–17:00
assert(
  isWithinCodingWindow({
    type: "CODING_BLOCK_2",
    localDate: DATE,
    timezone: TIMEZONE,
    now: utc("2026-09-20T08:00:00.000Z"),
  }),
  "14:00 Bangladesh time should be valid for Block 2",
);

assert(
  isWithinCodingWindow({
    type: "CODING_BLOCK_2",
    localDate: DATE,
    timezone: TIMEZONE,
    now: utc("2026-09-20T10:59:59.000Z"),
  }),
  "16:59:59 Bangladesh time should be valid for Block 2",
);

assert(
  !isWithinCodingWindow({
    type: "CODING_BLOCK_2",
    localDate: DATE,
    timezone: TIMEZONE,
    now: utc("2026-09-20T07:59:59.000Z"),
  }),
  "13:59:59 Bangladesh time should be invalid for Block 2",
);

assert(
  !isWithinCodingWindow({
    type: "CODING_BLOCK_2",
    localDate: DATE,
    timezone: TIMEZONE,
    now: utc("2026-09-20T11:00:01.000Z"),
  }),
  "17:00:01 Bangladesh time should be invalid for Block 2",
);

console.log("✓ Coding block window tests passed.");