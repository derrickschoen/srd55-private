# Incoming art assets

Drop zone for the image-generation assistant. Save each finished asset here
as `<uuidv7>-<slug>.<format>`, using the `deliverable.filename` from the
matching request in `art/requests/`. Rasters in this folder are ignored by
git on purpose: nothing here is served by the app or covered by the pinned
art inventory until it is promoted through the workflow in
`art/requests/README.md`.

`node art/requests/new-request.mjs --check` reports any asset here that has
no matching request and any request whose status disagrees with the files
present.
