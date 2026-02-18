import { performance } from "perf_hooks";

interface TestResult {
  name: string;
  method: "GET" | "POST";
  endpoint: string;
  totalRequests: number;
  successCount: number;
  errorCount: number;
  successRate: number;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  throughput: number; // requests per second
}

interface PerformanceTestConfig {
  baseUrl: string;
  numRequests: number;
  concurrentRequests: number;
  verbose: boolean;
}

class AcademyPerformanceTester {
  private config: PerformanceTestConfig;
  private results: TestResult[] = [];

  constructor(config: Partial<PerformanceTestConfig> = {}) {
    this.config = {
      baseUrl: config.baseUrl || "http://localhost:3000",
      numRequests: config.numRequests || 50,
      concurrentRequests: config.concurrentRequests || 10,
      verbose: config.verbose !== false,
    };
  }

  private log(message: string, color: "reset" | "red" | "green" | "yellow" | "blue" = "reset") {
    const colors: Record<string, string> = {
      reset: "\x1b[0m",
      red: "\x1b[31m",
      green: "\x1b[32m",
      yellow: "\x1b[33m",
      blue: "\x1b[34m",
    };
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  private async fetchWithTiming(
    url: string,
    options: RequestInit = {}
  ): Promise<{ statusCode: number; duration: number; success: boolean }> {
    const startTime = performance.now();
    try {
      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        ...options,
      });
      const duration = performance.now() - startTime;
      return {
        statusCode: response.status,
        duration,
        success: response.status >= 200 && response.status < 300,
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      return {
        statusCode: 0,
        duration,
        success: false,
      };
    }
  }

  private async testEndpoint(
    name: string,
    method: "GET" | "POST",
    endpoint: string,
    data?: unknown
  ): Promise<TestResult> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const durations: number[] = [];
    let successCount = 0;
    let errorCount = 0;

    this.log(`\n  Testing: ${name} (${method} ${endpoint})`, "yellow");

    // Sequential requests
    for (let i = 0; i < this.config.numRequests; i++) {
      if (i % 10 === 0 && this.config.verbose) {
        process.stdout.write(`    Progress: ${i}/${this.config.numRequests}\r`);
      }

      const result = await this.fetchWithTiming(url, {
        method,
        body: data ? JSON.stringify(data) : undefined,
      });

      durations.push(result.duration);
      if (result.success) {
        successCount++;
      } else {
        errorCount++;
      }
    }

    // Calculate statistics
    const sortedDurations = [...durations].sort((a, b) => a - b);
    const avgResponseTime = durations.reduce((a, b) => a + b, 0) / durations.length;
    const minResponseTime = Math.min(...durations);
    const maxResponseTime = Math.max(...durations);
    const p95Index = Math.floor(sortedDurations.length * 0.95);
    const p99Index = Math.floor(sortedDurations.length * 0.99);
    const p95ResponseTime = sortedDurations[p95Index] || 0;
    const p99ResponseTime = sortedDurations[p99Index] || 0;
    const successRate = (successCount / this.config.numRequests) * 100;
    const throughput = this.config.numRequests / (durations.reduce((a, b) => a + b, 0) / 1000 / 1000);

    const result: TestResult = {
      name,
      method,
      endpoint,
      totalRequests: this.config.numRequests,
      successCount,
      errorCount,
      successRate,
      avgResponseTime,
      minResponseTime,
      maxResponseTime,
      p95ResponseTime,
      p99ResponseTime,
      throughput,
    };

    // Print results
    this.log(
      `    Progress: ${this.config.numRequests}/${this.config.numRequests} ✓`,
      "green"
    );
    this.log(
      `    ✓ Success: ${successCount}/${this.config.numRequests} (${successRate.toFixed(1)}%)`,
      successCount === this.config.numRequests ? "green" : "yellow"
    );
    if (errorCount > 0) {
      this.log(`    ✗ Errors: ${errorCount}`, "red");
    }
    this.log(
      `    Avg Response: ${avgResponseTime.toFixed(2)}ms | Min: ${minResponseTime.toFixed(2)}ms | Max: ${maxResponseTime.toFixed(2)}ms`
    );
    this.log(
      `    P95: ${p95ResponseTime.toFixed(2)}ms | P99: ${p99ResponseTime.toFixed(2)}ms | Throughput: ${throughput.toFixed(2)} req/s`
    );

    return result;
  }

  private printHeader(title: string) {
    console.log("\n");
    this.log("═".repeat(75), "blue");
    this.log(title, "blue");
    this.log("═".repeat(75), "blue");
  }

  public async runAllTests() {
    this.log("\n╔═══════════════════════════════════════════════════════════════════════╗", "blue");
    this.log("║   SMAART Pro - Academy Management System Performance Test Suite       ║", "blue");
    this.log("╚═══════════════════════════════════════════════════════════════════════╝", "blue");

    this.log(`\nConfiguration:`, "yellow");
    this.log(`  Base URL: ${this.config.baseUrl}`);
    this.log(`  Requests per Endpoint: ${this.config.numRequests}`);
    this.log(`  Concurrent Requests: ${this.config.concurrentRequests}`);

    // Test suites
    this.printHeader("PHASE 1: Academy Dashboard API");
    this.results.push(
      await this.testEndpoint("Dashboard Metrics", "GET", "/api/academy", {})
    );

    this.printHeader("PHASE 2: Financial APIs");
    this.results.push(
      await this.testEndpoint("Financial Dashboard", "GET", "/api/academy/financial?type=dashboard", {})
    );
    this.results.push(
      await this.testEndpoint("Financial Modality Report", "GET", "/api/academy/financial?type=modality", {})
    );
    this.results.push(
      await this.testEndpoint("Financial Expenses Report", "GET", "/api/academy/financial?type=expenses", {})
    );

    this.printHeader("PHASE 3: Attendance APIs");
    this.results.push(
      await this.testEndpoint("Today's Attendance", "GET", "/api/academy/attendance/today", {})
    );

    this.printHeader("PHASE 4: Federation APIs");
    this.results.push(
      await this.testEndpoint("Federation Overview", "GET", "/api/academy/federation?type=overview", {})
    );
    this.results.push(
      await this.testEndpoint("Federation Events", "GET", "/api/academy/federation?type=events", {})
    );
    this.results.push(
      await this.testEndpoint("Federation Athletes", "GET", "/api/academy/federation?type=athletes", {})
    );

    this.printSummary();
  }

  private printSummary() {
    this.printHeader("SUMMARY");

    const table = this.results.map((r) => ({
      Name: r.name,
      "Avg (ms)": r.avgResponseTime.toFixed(2),
      "P95 (ms)": r.p95ResponseTime.toFixed(2),
      "P99 (ms)": r.p99ResponseTime.toFixed(2),
      "Success %": r.successRate.toFixed(1),
      "Req/s": r.throughput.toFixed(2),
    }));

    console.table(table);

    // Overall stats
    const avgAll = this.results.reduce((sum, r) => sum + r.avgResponseTime, 0) / this.results.length;
    const totalSuccess = this.results.reduce((sum, r) => sum + r.successCount, 0);
    const totalRequests = this.results.reduce((sum, r) => sum + r.totalRequests, 0);

    this.log("\nOverall Statistics:", "yellow");
    this.log(`  Total Tests: ${this.results.length}`);
    this.log(`  Total Requests: ${totalRequests}`);
    this.log(`  Overall Success Rate: ${((totalSuccess / totalRequests) * 100).toFixed(1)}%`, "green");
    this.log(`  Average Response Time: ${avgAll.toFixed(2)}ms`);
    this.log(`  Slowest Endpoint: ${this.results.sort((a, b) => b.avgResponseTime - a.avgResponseTime)[0]?.name}`);
    this.log(`  Fastest Endpoint: ${this.results.sort((a, b) => a.avgResponseTime - b.avgResponseTime)[0]?.name}`);

    // Export results
    const timestamp = new Date().toISOString();
    const filename = `/tmp/academy-perf-results-${Date.now()}.json`;
    const data = {
      timestamp,
      configuration: this.config,
      tests: this.results,
      summary: {
        totalTests: this.results.length,
        totalRequests,
        totalSuccess,
        successRate: (totalSuccess / totalRequests) * 100,
        averageResponseTime: avgAll,
      },
    };

    // Console log the JSON
    console.log("\n\nDetailed Results JSON:");
    console.log(JSON.stringify(data, null, 2));

    this.log(`\n✓ Performance testing complete!`, "green");
  }
}

// Run tests
const tester = new AcademyPerformanceTester({
  baseUrl: process.env.BASE_URL || "http://localhost:3000",
  numRequests: parseInt(process.env.NUM_REQUESTS || "50"),
  concurrentRequests: parseInt(process.env.CONCURRENT_REQUESTS || "10"),
});

tester.runAllTests().catch((error) => {
  console.error("Test failed:", error);
  process.exit(1);
});
