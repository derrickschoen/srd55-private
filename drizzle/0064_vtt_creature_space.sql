CREATE TABLE `vtt_session_revisions_v11` (
	`session_id` VARCHAR NOT NULL,
	`revision` integer NOT NULL,
	`schema_version` integer NOT NULL,
	`payload_json` VARCHAR NOT NULL,
	`payload_checksum` VARCHAR NOT NULL,
	PRIMARY KEY(`session_id`, `revision`),
	CONSTRAINT "vtt_session_revisions_session_id_check" CHECK(length("vtt_session_revisions_v11"."session_id") > 0),
	CONSTRAINT "vtt_session_revisions_revision_check" CHECK(typeof(`revision`) = 'integer' AND `revision` >= 1),
	CONSTRAINT "vtt_session_revisions_schema_version_check" CHECK("vtt_session_revisions_v11"."schema_version" IN (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11)),
	CONSTRAINT "vtt_session_revisions_payload_json_check" CHECK(json_valid("vtt_session_revisions_v11"."payload_json")),
	CONSTRAINT "vtt_session_revisions_payload_checksum_check" CHECK(length("vtt_session_revisions_v11"."payload_checksum") = 64
        AND "vtt_session_revisions_v11"."payload_checksum" NOT GLOB '*[^0-9a-f]*')
);

INSERT INTO `vtt_session_revisions_v11` (
	`session_id`, `revision`, `schema_version`, `payload_json`, `payload_checksum`
)
SELECT `session_id`, `revision`, `schema_version`, `payload_json`, `payload_checksum`
FROM `vtt_session_revisions`;

DROP TABLE `vtt_session_revisions`;
ALTER TABLE `vtt_session_revisions_v11` RENAME TO `vtt_session_revisions`;
