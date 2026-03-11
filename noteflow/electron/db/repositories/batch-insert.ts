import type { Database, Statement } from "better-sqlite3";

type SQLiteBinding = Buffer | Uint8Array | string | number | bigint | null;

type BatchedInsertOptions<Row> = {
  batchSize: number;
  placeholderGroup: string;
  buildStatement: (valuesSql: string) => string;
  mapParams: (row: Row) => SQLiteBinding[];
};

export function runBatchedInsert<Row>(db: Database, rows: Row[], options: BatchedInsertOptions<Row>): void {
  const preparedStatements = new Map<number, Statement>();

  for (let index = 0; index < rows.length; index += options.batchSize) {
    const batch = rows.slice(index, index + options.batchSize);
    let statement = preparedStatements.get(batch.length);
    if (!statement) {
      const valuesSql = batch.map(() => options.placeholderGroup).join(", ");
      statement = db.prepare(options.buildStatement(valuesSql));
      preparedStatements.set(batch.length, statement);
    }

    const batchParams = batch.flatMap((row) => options.mapParams(row));
    statement.run(...batchParams);
  }
}
