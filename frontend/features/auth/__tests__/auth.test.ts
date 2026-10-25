import { HttpError, isUnauthorizedError } from "@/shared/api/http-client";
import { me } from "../api/me";

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ ${testName}${detail ? ` - ${detail}` : ""}`);
    failed++;
  }
}

async function runTests() {
  console.log("--- Running Auth & Session Handling Unit Tests ---\n");

  // 1. isUnauthorizedError tests
  {
    const httpError401 = new HttpError("Unauthorized", 401);
    assert(isUnauthorizedError(httpError401), "identifies HttpError with status 401");

    const objWith401 = { status: 401, message: "Unauthorized" };
    assert(isUnauthorizedError(objWith401), "identifies object with status 401");

    const objWithInvalidToken = { message: "Invalid token" };
    assert(isUnauthorizedError(objWithInvalidToken), "identifies object with 'Invalid token'");

    const httpError500 = new HttpError("Internal server error", 500);
    assert(!isUnauthorizedError(httpError500), "rejects HttpError with status 500");

    const httpError404 = new HttpError("Not found", 404);
    assert(!isUnauthorizedError(httpError404), "rejects HttpError with status 404");

    const genericError = new Error("Network error");
    assert(!isUnauthorizedError(genericError), "rejects generic Error");

    assert(!isUnauthorizedError(null), "rejects null");
    assert(!isUnauthorizedError(undefined), "rejects undefined");
    assert(!isUnauthorizedError("error"), "rejects string");
  }

  // 2. me() guest handling on 401
  {
    const originalFetch = globalThis.fetch;
    let fetchCount = 0;

    globalThis.fetch = (async () => {
      fetchCount++;
      return new Response(JSON.stringify({ message: "Unauthorized" }), {
        status: 401,
        statusText: "Unauthorized",
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;

    try {
      const result = await me({ force: true });
      assert(result === null, "me() resolves to null on 401 guest response instead of rejecting");
      assert(fetchCount === 1, "me() triggered exactly 1 fetch request");
    } finally {
      globalThis.fetch = originalFetch;
    }
  }

  // 3. me() in-flight coalescing (prevents duplicate requests and initialization races)
  {
    const originalFetch = globalThis.fetch;
    let fetchCount = 0;

    globalThis.fetch = (async () => {
      fetchCount++;
      await new Promise((resolve) => setTimeout(resolve, 50));
      return new Response(
        JSON.stringify({ id: 42, username: "testuser", email: "test@example.com" }),
        {
          status: 200,
          statusText: "OK",
          headers: { "Content-Type": "application/json" },
        }
      );
    }) as typeof fetch;

    try {
      const [res1, res2, res3] = await Promise.all([
        me({ force: true }),
        me(),
        me(),
      ]);

      assert(fetchCount === 1, "Concurrent me() calls coalesce into a single in-flight request");
      assert(res1?.id === 42, "Promise 1 resolves to authenticated user");
      assert(res2?.id === 42, "Promise 2 resolves to authenticated user");
      assert(res3?.id === 42, "Promise 3 resolves to authenticated user");
    } finally {
      globalThis.fetch = originalFetch;
    }
  }

  // 4. me() rethrows unexpected 500 error (does not mask real server errors)
  {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async () => {
      return new Response(JSON.stringify({ message: "Internal server error" }), {
        status: 500,
        statusText: "Internal Server Error",
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;

    try {
      let threw = false;
      try {
        await me({ force: true });
      } catch (err) {
        threw = true;
        assert(err instanceof HttpError && err.status === 500, "me() preserves non-401 application errors");
      }
      assert(threw, "me() rethrows on unexpected server error (500)");
    } finally {
      globalThis.fetch = originalFetch;
    }
  }

  console.log(`\n========================================`);
  console.log(`Auth Unit Test Results: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test runner failed:", err);
  process.exit(1);
});
