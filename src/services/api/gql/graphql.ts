/* eslint-disable */
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import type { DocumentTypeDecoration } from '@graphql-typed-document-node/core';
export type ReportsOverviewQueryVariables = Exact<{
  from?: string | null | undefined;
  to?: string | null | undefined;
}>;

export type ReportsOverviewQuery = {
  salesSummary: {
    current: { totalSales: number; totalOrders: number; averageTicket: number };
    previous: { totalSales: number; totalOrders: number; averageTicket: number } | null;
  };
  salesByDriver: {
    rows: Array<{ driverId: string; driverName: string | null; totalOrders: number; totalSales: number }>;
    totals: { totalOrders: number; totalSales: number };
  };
};

export class TypedDocumentString<TResult, TVariables>
  extends String
  implements DocumentTypeDecoration<TResult, TVariables>
{
  __apiType?: NonNullable<DocumentTypeDecoration<TResult, TVariables>['__apiType']>;
  private value: string;
  public __meta__?: Record<string, any> | undefined;

  constructor(value: string, __meta__?: Record<string, any> | undefined) {
    super(value);
    this.value = value;
    this.__meta__ = __meta__;
  }

  override toString(): string & DocumentTypeDecoration<TResult, TVariables> {
    return this.value;
  }
}

export const ReportsOverviewDocument = new TypedDocumentString(`
    query ReportsOverview($from: String, $to: String) {
  salesSummary(from: $from, to: $to) {
    current {
      totalSales
      totalOrders
      averageTicket
    }
    previous {
      totalSales
      totalOrders
      averageTicket
    }
  }
  salesByDriver(from: $from, to: $to) {
    rows {
      driverId
      driverName
      totalOrders
      totalSales
    }
    totals {
      totalOrders
      totalSales
    }
  }
}
    `) as unknown as TypedDocumentString<ReportsOverviewQuery, ReportsOverviewQueryVariables>;
