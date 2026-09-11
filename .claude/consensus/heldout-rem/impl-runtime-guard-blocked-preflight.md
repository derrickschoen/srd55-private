Step 0 failed, so implementation stopped before loading candidate configuration or editing files. Temporary files were cleaned up; HEAD remains `3e439b07` with a clean tracked worktree.

Exact executed invocation:

```sh
/usr/bin/prlimit --nproc=64 --nofile=256 --fsize=16777216 --as=1073741824 -- \
  /usr/bin/bwrap \
  --die-with-parent --new-session \
  --unshare-user --unshare-pid --unshare-ipc --unshare-uts \
  --unshare-cgroup --unshare-net \
  --ro-bind /usr /usr \
  --ro-bind /lib /lib \
  --ro-bind /lib64 /lib64 \
  --dev /dev \
  --ro-bind /tmp/heldout-runtime-preflight.hGK6qt/work /work \
  --ro-bind /tmp/heldout-runtime-preflight.hGK6qt/guard /guard \
  --bind /tmp/heldout-runtime-preflight.hGK6qt/scratch /scratch \
  --bind /tmp/heldout-runtime-preflight.hGK6qt/scratch/tmp /tmp \
  --bind /tmp/heldout-runtime-preflight.hGK6qt/scratch/home /home/guard \
  --chdir /work \
  /usr/bin/env -i \
  PATH=/usr/bin:/bin HOME=/home/guard TMPDIR=/tmp \
  LANG=C.UTF-8 LC_ALL=C.UTF-8 \
  /usr/bin/node -e "<filesystem and network isolation assertions>"
```

Result:

```text
bubblewrap 0.6.1
Error: Cannot find module 'node:fs'
Require stack:
- /work/[eval]
code: 'MODULE_NOT_FOUND'
```

The mounted `/usr/bin/node` is an older runtime and cannot load `node:` built-ins. The intended Node 24 runtime/library closure must be mounted explicitly before the canary can pass.

BLOCKED: mandatory bubblewrap preflight failed because the mounted `/usr/bin/node` lacks `node:fs`; no candidate configuration was loaded.