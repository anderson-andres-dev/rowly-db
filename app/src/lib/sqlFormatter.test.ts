import { ENGINES } from "./engines";
import { describe, expect, it } from "vitest";
import { formatSqlBlock, formatSqlText } from "./sqlFormatter";

describe("formatSqlBlock", () => {
  it("keeps a short query on one normalized line", async () => {
    await expect(formatSqlBlock("select *  from users where id=1", ENGINES.postgres, 60)).resolves.toBe(
      "SELECT * FROM users WHERE id = 1",
    );
  });

  it("uses a structured layout after the configured width", async () => {
    const result = await formatSqlBlock(
      "select customer_id, customer_name, customer_email from customers where active=true order by customer_name",
      ENGINES.mysql,
      60,
    );

    expect(result).toContain("SELECT\n");
    expect(result).toContain("\nFROM customers");
    expect(result).toContain("\nWHERE active = TRUE");
  });

  it("keeps long SQL in compact, readable blocks", async () => {
    const result = await formatSqlBlock(
      "select customer_id, customer_name, (select count(*) from orders where orders.customer_id=customers.customer_id) as order_count from customers where active=true order by customer_name",
      ENGINES.mysql,
      60,
    );

    expect(result).toContain("(SELECT COUNT(*)");
    expect(result).toContain("FROM orders");
    expect(result).toContain("WHERE orders.customer_id = customers.customer_id");
    expect(result).toContain("ORDER BY customer_name");
    expect(result).not.toContain("FROM\n");
    expect(result).not.toContain("WHERE\n");
  });

  it("does not collapse spaces inside string literals", async () => {
    await expect(formatSqlBlock("select 'hello   world' as label", ENGINES.postgres, 60)).resolves.toBe(
      "SELECT 'hello   world' AS label",
    );
  });

  it("keeps line comments on their own line", async () => {
    const result = await formatSqlBlock("select id -- identity\nfrom users", ENGINES.postgres, 200);
    expect(result).toContain("-- identity\n");
  });

  it("uses the selected indentation for a block and multiple statements", async () => {
    const source = "select customer_id, customer_name, customer_email from customers where active=true order by customer_name";
    const spaces = await formatSqlBlock(source, ENGINES.mysql, 60, true, "spaces", 4);
    const tabs = await formatSqlBlock(source, ENGINES.mysql, 60, true, "tabs", 4);
    expect(spaces).toMatch(/\n {4}\S/);
    expect(await formatSqlBlock(source, ENGINES.mysql, 60, true, "spaces", 8)).toMatch(/\n {8}\S/);
    expect(tabs).toMatch(/\n\t\S/);
    expect(tabs).not.toMatch(/\n {2}\S/);
    const script = await formatSqlText(`${source};\n${source};`, ENGINES.mysql, 60, true, "tabs", 8);
    expect(script.formatted).toBe(2);
    expect(script.text.match(/\n\t\S/g)?.length).toBeGreaterThan(1);
  });

  it("keeps indenting with tabs after a MySQL # comment with an apostrophe or a name with $", async () => {
    const mysql = await formatSqlBlock("select a, b # don't\nfrom t where a = 1 and b = 2 order by a", ENGINES.mysql, 20, true, "tabs", 4);
    expect(mysql).toMatch(/\n\t\S/);
    expect(mysql).not.toMatch(/\n {2}\S/);
    const postgres = await formatSqlBlock("select price$usd$x, b from t where a = 1 and b = 2 order by a", ENGINES.postgres, 20, true, "tabs", 4);
    expect(postgres).toMatch(/\n\t\S/);
    expect(postgres).not.toMatch(/\n {2}\S/);
  });

  it("keeps spaces inside a multiline literal when using tabs", async () => {
    const result = await formatSqlBlock("select 'first\n  second' as label, customer_id, customer_name from customers", ENGINES.postgres, 60, true, "tabs", 4);
    expect(result).toContain("first\n  second");
  });
});
