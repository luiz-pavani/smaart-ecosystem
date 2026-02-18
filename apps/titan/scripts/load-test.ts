import { performance } from "perf_hooks";

console.log("\n╔═══════════════════════════════════════════════════════════════════════╗");
console.log("║   SMAART Pro - Academy Management Performance Benchmarks               ║");
console.log("╚═══════════════════════════════════════════════════════════════════════╝\n");

// Test page load times for critical routes
const pages = [
  { name: "Dashboard", path: "/academy/dashboard" },
  { name: "Classes", path: "/academy/classes" },
  { name: "Instructors", path: "/academy/instructors" },
  { name: "Attendance", path: "/academy/attendance" },
  { name: "Belt Progression", path: "/academy/belts" },
  { name: "Financial Hub", path: "/academy/financial" },
  { name: "Financial Dashboard", path: "/academy/financial/dashboard" },
  { name: "Federation", path: "/academy/federation" },
  { name: "Event Registration", path: "/academy/federation/events" },
];

interface PageLoadResult {
  name: string;
  path: string;
  avgTime: number;
  minTime: number;
  maxTime: number;
  successRate: number;
}

async function testPageLoad(
  name: string,
  path: string,
  numTests: number = 20
): Promise<PageLoadResult> {
  const times: number[] = [];
  let successCount = 0;

  process.stdout.write(`  Testing ${name}... `);

  for (let i = 0; i < numTests; i++) {
    const start = performance.now();
    try {
      const response = await fetch(`http://localhost:3000${path}`, {
        headers: {
          Accept: "text/html",
          "User-Agent": "Performance-Tester/1.0",
        },
      });

      const duration = performance.now() - start;
      times.push(duration);

      // Consider redirects as success for now (auth redirects)
      if (response.ok || response.status === 307 || response.status === 302) {
        successCount++;
      }
    } catch (error) {
      const duration = performance.now() - start;
      times.push(duration);
    }
  }

  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const successRate = (successCount / numTests) * 100;

  console.log(
    `✓ Avg: ${avgTime.toFixed(0)}ms | Min: ${minTime.toFixed(0)}ms | Max: ${maxTime.toFixed(0)}ms`
  );

  return { name, path, avgTime, minTime, maxTime, successRate };
}

async function testRouteHandling() {
  console.log("\n┌─────────────────────────────────────────────────────────────────────┐");
  console.log("│ PAGE LOAD PERFORMANCE (20 requests per page)                        │");
  console.log("└─────────────────────────────────────────────────────────────────────┘\n");

  const results: PageLoadResult[] = [];

  for (const page of pages) {
    const result = await testPageLoad(page.name, page.path, 20);
    results.push(result);
    // Small delay between requests to avoid hammering
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Print summary
  console.log("\n┌─────────────────────────────────────────────────────────────────────┐");
  console.log("│ SUMMARY TABLE                                                       │");
  console.log("└─────────────────────────────────────────────────────────────────────┘\n");

  const table = results.map((r) => ({
    Page: r.name,
    "Avg (ms)": r.avgTime.toFixed(0),
    "Min (ms)": r.minTime.toFixed(0),
    "Max (ms)": r.maxTime.toFixed(0),
    "Success %": r.successRate.toFixed(1),
  }));

  console.table(table);

  // Calculate overall stats
  const avgAll = results.reduce((sum, r) => sum + r.avgTime, 0) / results.length;
  const slowest = results.reduce((prev, current) =>
    prev.avgTime > current.avgTime ? prev : current
  );
  const fastest = results.reduce((prev, current) =>
    prev.avgTime < current.avgTime ? prev : current
  );

  console.log("\n┌─────────────────────────────────────────────────────────────────────┐");
  console.log("│ PERFORMANCE METRICS                                                 │");
  console.log("└─────────────────────────────────────────────────────────────────────┘\n");

  console.log(`  Total Pages Tested: ${results.length}`);
  console.log(`  Average Load Time: ${avgAll.toFixed(0)}ms`);
  console.log(`  Fastest Page: ${fastest.name} (${fastest.avgTime.toFixed(0)}ms)`);
  console.log(`  Slowest Page: ${slowest.name} (${slowest.avgTime.toFixed(0)}ms)`);
  console.log(
    `  Performance Variance: ${((slowest.avgTime - fastest.avgTime) / fastest.avgTime * 100).toFixed(1)}%`
  );

  // Performance benchmarks
  console.log("\n┌─────────────────────────────────────────────────────────────────────┐");
  console.log("│ PERFORMANCE GRADES                                                  │");
  console.log("└─────────────────────────────────────────────────────────────────────┘\n");

  results.forEach((r) => {
    let grade = "F";
    if (r.avgTime < 100) grade = "A";
    else if (r.avgTime < 200) grade = "B";
    else if (r.avgTime < 500) grade = "C";
    else if (r.avgTime < 1000) grade = "D";

    const emoji =
      grade === "A"
        ? "🟢"
        : grade === "B"
          ? "🟡"
          : grade === "C"
            ? "🟠"
            : "🔴";

    console.log(`  ${emoji} ${r.name.padEnd(30)} ${grade} (${r.avgTime.toFixed(0)}ms)`);
  });

  // Detailed breakdown
  console.log("\n┌─────────────────────────────────────────────────────────────────────┐");
  console.log("│ DETAILED RESULTS                                                    │");
  console.log("└─────────────────────────────────────────────────────────────────────┘\n");

  console.log(JSON.stringify(
    {
      timestamp: new Date().toISOString(),
      totalPages: results.length,
      results,
      summary: {
        averageLoadTime: avgAll,
        fastestPage: fastest.name,
        slowestPage: slowest.name,
      },
    },
    null,
    2
  ));
}

// Run tests
testRouteHandling()
  .then(() => {
    console.log("\n✓ Performance testing complete!\n");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Test failed:", error);
    process.exit(1);
  });
