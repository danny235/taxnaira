/**
 * A ultra-minimal utility to "heal" truncated JSON strings/objects.
 * Useful when AI models cut off mid-response due to token limits.
 */
export function repairJson(jsonString: string): string {
  let repaired = jsonString.trim();

  // 1. Basic cleaning
  if (repaired.startsWith("```")) {
    repaired = repaired.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  // 2. Handle common truncation at the end of a string value
  // If it ends with a character that isn't a closing brace/bracket/quote/digit/boolean
  // and we are inside a string, close it.

  let isInsideString = false;
  let stack: string[] = [];
  let escape = false;

  for (let i = 0; i < repaired.length; i++) {
    const char = repaired[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (char === "\\") {
      escape = true;
      continue;
    }

    if (char === '"') {
      isInsideString = !isInsideString;
      continue;
    }

    if (!isInsideString) {
      if (char === "{" || char === "[") {
        stack.push(char === "{" ? "}" : "]");
      } else if (char === "}" || char === "]") {
        if (stack.length > 0 && stack[stack.length - 1] === char) {
          stack.pop();
        }
      }
    }
  }

  // Repair logic
  if (isInsideString) {
    repaired += '"'; // Close the hanging string
  }

  // Close hanging objects/arrays in reverse order
  while (stack.length > 0) {
    const closer = stack.pop();
    repaired += closer;
  }

  return repaired;
}

/**
 * Safely parse JSON that might be truncated or malformed.
 */
export function safeParse(jsonString: string, fallback: any = []): any {
  try {
    const cleaned = jsonString.trim();
    // Try standard parse first
    try {
      return JSON.parse(cleaned);
    } catch (e) {
      // Try repaired parse
      const repaired = repairJson(cleaned);
      console.warn("🔧 Repaired truncated JSON output");
      return JSON.parse(repaired);
    }
  } catch (finalError) {
    console.error(
      "❌ Final JSON Parse Failure after repair attempt:",
      finalError,
    );
    return fallback;
  }
}
