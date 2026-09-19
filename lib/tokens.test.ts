import { tokensForCompletion } from "./tokens";

const tests = [
  { completion: 0, expected: 0 },
  { completion: 39.99, expected: 0 },
  { completion: 40, expected: 3 },
  { completion: 59.99, expected: 3 },
  { completion: 60, expected: 6 },
  { completion: 79.99, expected: 6 },
  { completion: 80, expected: 8 },
  { completion: 99.99, expected: 8 },
  { completion: 100, expected: 10 },
];

for (const test of tests) {
  const actual = tokensForCompletion(test.completion);

  if (actual !== test.expected) {
    throw new Error(
      `Failed: ${test.completion}% expected ${test.expected}, got ${actual}`
    );
  }
}

console.log("Token reward tests passed.");