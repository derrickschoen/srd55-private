import { CatalogImporter } from '../../catalog/catalog-importer';
import {
  isCatalogImportParams,
  isForkSpellParams,
} from '../../catalog/catalog-schema';
import { forkSrdSpell } from '../../catalog/spell-fork';
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
  defineRpcHandler(
    'catalog.forkSpell',
    isForkSpellParams,
    (context, params) => forkSrdSpell(context.db, params),
  ),
]);
