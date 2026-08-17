import type { DatabaseContext } from '../../src/db/database';
import type { TransactionRunner } from '../../src/db/transaction';
import type { Outcome } from '../../src/refusals/outcome';
import {
  type CommandTransactionHost,
  runCommandTransaction,
} from '../../src/refusals/transaction-outcome';

type Assert<T extends true> = T;

type Exact<A, B> =
  (<G>() => G extends A ? 1 : 2) extends (<G>() => G extends B ? 1 : 2)
    ? true
    : false;

type PromiseValueTransaction = typeof runCommandTransaction<Promise<string>>;
type PromiseValueBody = Parameters<PromiseValueTransaction>[1];

type _HostExposesOnlyTransaction = Assert<
  Exact<keyof CommandTransactionHost, 'transaction'>
>;

type _DatabaseContextSatisfiesHost = Assert<
  DatabaseContext extends CommandTransactionHost ? true : false
>;

type _RawTransactionRunnerIsRejected = Assert<
  TransactionRunner extends CommandTransactionHost ? false : true
>;

type _PromiseValueBecomesUninhabitable = Assert<
  Exact<ReturnType<PromiseValueBody>, Outcome<never>>
>;

type _PromiseReturningBodyIsRejected = Assert<
  (() => Promise<Outcome<never>>) extends PromiseValueBody ? false : true
>;

export type CommandTransactionSynchronousBodyProof = [
  _HostExposesOnlyTransaction,
  _DatabaseContextSatisfiesHost,
  _RawTransactionRunnerIsRejected,
  _PromiseValueBecomesUninhabitable,
  _PromiseReturningBodyIsRejected,
];
