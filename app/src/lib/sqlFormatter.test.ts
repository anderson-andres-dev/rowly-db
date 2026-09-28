import { ENGINES } from "./engines";
import { describe, expect, it } from "vitest";
import { formatSqlBlock } from "./sqlFormatter";

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
});
