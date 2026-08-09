# Where the 3.5 SRD material came from

Provenance for the files in this directory, following the pattern of
`docs/srd/SOURCE.md`: every value here can be traced back to a document rather
than to somebody's memory of the rules.

## The source

| | |
|---|---|
| Document | Dungeons & Dragons 3.5 System Reference Document, the Wizards RTF distribution |
| Host | Internet Archive item `dnd35srd` |
| URL | https://archive.org/download/dnd35srd/SRD.zip |
| Retrieved | 2026-08-06 |
| Size | 2,316,202 bytes |
| SHA-256 | `a8ccb96c8acbe0c9f70aaa04157433bb8f71f31cfcf6c74fc32043d88bab95ea` |
| Licence | Open Game License 1.0a |

Wizards no longer hosts the 3.0/3.5 SRD downloads. The historical paths under
`media.wizards.com` and `wizards.com/d20/files/` return 404, and the Open Gaming
Foundation's SRD page now reads only *"This page is no longer maintained."* The
Internet Archive item is the surviving copy of the official RTF distribution;
its `Legal.rtf` is committed here as `Legal.txt` so the licence terms and the
Product Identity designation can be read from the source itself.

## Files here

| File | What it is |
|---|---|
| `SRD-3.5-rtf.zip` | The distribution as downloaded, unmodified. 86 RTF files, ~20 MB expanded. Committed zipped rather than expanded — it is reference material we never edit. |
| `Legal.txt` | The distribution's `Legal.rtf`, converted to text. Contains the OGL 1.0a, the Section 15 chain, and the Product Identity designation. |
| `psionic-fist.txt` | The Psionic Fist prestige class, extracted verbatim from `PsionicClasses.rtf`. This is the working extract for the conversion commissioned 2026-08-06. |

## Re-deriving the text

```sh
curl -sSLO https://archive.org/download/dnd35srd/SRD.zip
sha256sum SRD.zip          # must match the table above
unzip -d x35 SRD.zip
soffice --headless --convert-to 'txt:Text (encoded):UTF8' --outdir txt35 x35/*.rtf
```

`soffice` is LibreOffice. The RTFs are Word-era and `unrtf` mangles the class
tables; LibreOffice preserves them as one cell per line, which is ugly but
lossless. Table rows therefore appear as vertical runs of values — read them
against the column headers immediately above.

Note the files use curly quotes and en-dashes throughout. Any extraction that
slices by byte rather than character will split one and produce invalid UTF-8.

## Licence obligations

This material is Open Game Content under the OGL 1.0a. See `../OGL-1.0a.txt`
for the licence, `../SECTION-15.md` for the copyright chain that must accompany
any distribution, and `../LICENSING.md` for what may and may not be carried out
of this folder.
