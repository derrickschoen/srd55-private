-- Owner D948: the SQLite VTT session store had no production caller (browser saves live in IndexedDB,
-- local-session-store.ts), so SAVE-COMPAT deletes it and this drops its unused revision table. The migrations
-- that created and widened the table (0052-0067) stay as shipped: their checksums are pinned.
DROP TABLE `vtt_session_revisions`;
