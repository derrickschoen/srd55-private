import { CatalogImporter } from '../../catalog/catalog-importer';
import {
  isCatalogImportParams,
} from '../../catalog/catalog-schema';
import {
  defineRpcHandler,
  type RpcHandler,
} from '../handler';

export const handlers: readonly RpcHandler[] = Object.freeze([
  defineRpcHandler(
    'catalog.import',
    isCatalogImportParams,
    (context, params) => new CatalogImporter(context.db).import(params),
  ),
]);
