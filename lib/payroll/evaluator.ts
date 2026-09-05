/**
 * Sandboxed Expression Evaluator for Salary Rules.
 * Evaluates mathematical expressions using only whitelisted tokens and context variables.
 * Never uses eval() or new Function().
 *
 * @see PayCore_Build_Prompt.md Section 4.7
 */

export interface FormulaScope {
  [key: string]: number;
}

export const ALLOWED_CONTEXT_VARS = [
  "WORKED_DAYS",
  "TOTAL_WORKING_DAYS",
  "UNPAID_LEAVE_DAYS",
  "OVERTIME_HOURS",
  "CONTRACT_WAGE",
  "WAGE",
] as const;

type TokenType = "NUMBER" | "IDENTIFIER" | "OPERATOR" | "LPAREN" | "RPAREN";

interface Token {
  type: TokenType;
  value: string;
}

/**
 * Tokenize a formula string.
 */
function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < expression.length) {
    const char = expression[i];

    if (/\s/.test(char)) {
      i++;
      continue;
    }

    if (/[0-9]/.test(char) || (char === "." && /[0-9]/.test(expression[i + 1] || ""))) {
      let numStr = "";
      while (i < expression.length && /[0-9.]/.test(expression[i])) {
        numStr += expression[i];
        i++;
      }
      tokens.push({ type: "NUMBER", value: numStr });
      continue;
    }

    if (/[a-zA-Z_]/.test(char)) {
      let idStr = "";
      while (i < expression.length && /[a-zA-Z0-9_]/.test(expression[i])) {
        idStr += expression[i];
        i++;
      }
      tokens.push({ type: "IDENTIFIER", value: idStr.toUpperCase() });
      continue;
    }

    if ("+-*/%".includes(char)) {
      tokens.push({ type: "OPERATOR", value: char });
      i++;
      continue;
    }

    if (char === "(") {
      tokens.push({ type: "LPAREN", value: "(" });
      i++;
      continue;
    }

    if (char === ")") {
      tokens.push({ type: "RPAREN", value: ")" });
      i++;
      continue;
    }

    throw new Error(`Invalid character in expression: '${char}'`);
  }

  return tokens;
}

/**
 * Recursive descent parser & evaluator.
 * Grammar:
 * Expression := Term (('+' | '-') Term)*
 * Term       := Factor (('*' | '/' | '%') Factor)*
 * Factor     := ('+' | '-')? Primary
 * Primary    := NUMBER | IDENTIFIER | '(' Expression ')'
 */
class ExpressionParser {
  private tokens: Token[];
  private pos = 0;
  private scope: FormulaScope;

  constructor(tokens: Token[], scope: FormulaScope) {
    this.tokens = tokens;
    this.scope = scope;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private consume(): Token {
    return this.tokens[this.pos++];
  }

  public parse(): number {
    const result = this.parseExpression();
    if (this.pos < this.tokens.length) {
      throw new Error(`Unexpected token at position ${this.pos}: '${this.peek()?.value}'`);
    }
    return result;
  }

  private parseExpression(): number {
    let left = this.parseTerm();

    while (this.peek() && (this.peek()!.value === "+" || this.peek()!.value === "-")) {
      const op = this.consume().value;
      const right = this.parseTerm();
      if (op === "+") left += right;
      else left -= right;
    }

    return left;
  }

  private parseTerm(): number {
    let left = this.parseFactor();

    while (
      this.peek() &&
      (this.peek()!.value === "*" || this.peek()!.value === "/" || this.peek()!.value === "%")
    ) {
      const op = this.consume().value;
      const right = this.parseFactor();
      if (op === "*") {
        left *= right;
      } else if (op === "/") {
        if (right === 0) throw new Error("Division by zero in formula");
        left /= right;
      } else if (op === "%") {
        if (right === 0) throw new Error("Modulo by zero in formula");
        left %= right;
      }
    }

    return left;
  }

  private parseFactor(): number {
    const token = this.peek();
    if (token && (token.value === "+" || token.value === "-")) {
      const op = this.consume().value;
      const factor = this.parseFactor();
      return op === "-" ? -factor : factor;
    }

    return this.parsePrimary();
  }

  private parsePrimary(): number {
    const token = this.peek();
    if (!token) {
      throw new Error("Unexpected end of expression");
    }

    if (token.type === "NUMBER") {
      this.consume();
      const val = parseFloat(token.value);
      if (isNaN(val)) throw new Error(`Invalid number: ${token.value}`);
      return val;
    }

    if (token.type === "IDENTIFIER") {
      this.consume();
      const varName = token.value;
      if (!(varName in this.scope)) {
        throw new Error(
          `Unknown variable in formula: '${varName}'. Allowed variables: ${Object.keys(
            this.scope
          ).join(", ")}`
        );
      }
      return this.scope[varName];
    }

    if (token.type === "LPAREN") {
      this.consume(); // consume '('
      const expr = this.parseExpression();
      const next = this.peek();
      if (!next || next.type !== "RPAREN") {
        throw new Error("Missing closing parenthesis ')'");
      }
      this.consume(); // consume ')'
      return expr;
    }

    throw new Error(`Unexpected token: '${token.value}'`);
  }
}

/**
 * Safely evaluates a formula expression against a given scope.
 */
export function evaluateFormula(expression: string, scope: FormulaScope): number {
  if (!expression || !expression.trim()) return 0;
  const tokens = tokenize(expression.trim());
  const parser = new ExpressionParser(tokens, scope);
  const result = parser.parse();
  return Number(result.toFixed(4));
}

/**
 * Dry-runs a formula for validation.
 */
export function validateFormula(
  expression: string,
  availableRules: string[] = []
): { valid: boolean; result?: number; error?: string } {
  try {
    const sampleScope: FormulaScope = {
      WORKED_DAYS: 22,
      TOTAL_WORKING_DAYS: 22,
      UNPAID_LEAVE_DAYS: 0,
      OVERTIME_HOURS: 0,
      CONTRACT_WAGE: 85000,
    };

    // Add dummy values for all lower-sequence available rules
    for (const r of availableRules) {
      sampleScope[r.toUpperCase()] = 10000;
    }

    const result = evaluateFormula(expression, sampleScope);
    return { valid: true, result };
  } catch (err: any) {
    return { valid: false, error: err.message };
  }
}
