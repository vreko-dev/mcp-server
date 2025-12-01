/**
 * Dynamic filter builder for analytics queries
 * Builds parameterized SQL WHERE clauses with type-safe parameter tracking
 */

export interface FilterResult {
	sql: string;
	params: any[];
}

interface FilterCondition {
	sql: string;
	params: any[];
}

export class FilterBuilder {
	private conditions: FilterCondition[] = [];
	private parameterIndex = 1;

	/**
	 * Add an equality filter: column = value
	 */
	whereEquals(column: string, value: any): this {
		this.conditions.push({
			sql: `${column} = $${this.parameterIndex}`,
			params: [value],
		});
		this.parameterIndex++;
		return this;
	}

	/**
	 * Add a range filter: column >= start AND column <= end
	 */
	whereBetween(column: string, start: any, end: any): this {
		this.conditions.push({
			sql: `${column} >= $${this.parameterIndex}`,
			params: [start],
		});
		this.parameterIndex++;

		this.conditions.push({
			sql: `${column} <= $${this.parameterIndex}`,
			params: [end],
		});
		this.parameterIndex++;
		return this;
	}

	/**
	 * Add an IN filter: column IN (value1, value2, ...)
	 */
	whereIn(column: string, values: any[]): this {
		const placeholders = values.map((_, idx) => `$${this.parameterIndex + idx}`).join(", ");

		this.conditions.push({
			sql: `${column} IN (${placeholders})`,
			params: values,
		});
		this.parameterIndex += values.length;
		return this;
	}

	/**
	 * Add a greater than filter: column > value
	 */
	whereGreaterThan(column: string, value: any): this {
		this.conditions.push({
			sql: `${column} > $${this.parameterIndex}`,
			params: [value],
		});
		this.parameterIndex++;
		return this;
	}

	/**
	 * Add a less than filter: column < value
	 */
	whereLessThan(column: string, value: any): this {
		this.conditions.push({
			sql: `${column} < $${this.parameterIndex}`,
			params: [value],
		});
		this.parameterIndex++;
		return this;
	}

	/**
	 * Add a LIKE filter: column LIKE pattern
	 */
	whereLike(column: string, pattern: string): this {
		this.conditions.push({
			sql: `${column} LIKE $${this.parameterIndex}`,
			params: [pattern],
		});
		this.parameterIndex++;
		return this;
	}

	/**
	 * Add a NULL check: column IS NULL
	 */
	whereNull(column: string): this {
		this.conditions.push({
			sql: `${column} IS NULL`,
			params: [],
		});
		return this;
	}

	/**
	 * Add a NOT NULL check: column IS NOT NULL
	 */
	whereNotNull(column: string): this {
		this.conditions.push({
			sql: `${column} IS NOT NULL`,
			params: [],
		});
		return this;
	}

	/**
	 * Reset all filters
	 */
	reset(): this {
		this.conditions = [];
		this.parameterIndex = 1;
		return this;
	}

	/**
	 * Build the final SQL and parameters
	 */
	build(): FilterResult {
		if (this.conditions.length === 0) {
			return { sql: "", params: [] };
		}

		const sql = this.conditions.map((c) => c.sql).join(" AND ");
		const params = this.conditions.flatMap((c) => c.params);

		return { sql, params };
	}
}
