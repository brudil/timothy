# timothy
Fountain-ish to PDF for sketch scripts.

```yarn global add @comsoc/timothy```

```timothy carehome.fountain --with-notes --edit-space -o carehome.pdf```

## CLI

### Options

### --with-notes, -N
Renders Fountain notes in the output

### --edit-space, -s
Increases space between height dialogue for last minute analogue-based pen/pencil editing (scrawling).

## --sans-serif, -S
Use Helvetica instead of Courier Prime.


# Fountain improvements

## Added support for audio cues.

```F/X. DIAL TONE```

Supports `F/X.`, `ATMOS.` and `GRAMS.`

## Series metadata key
For grouping a series of sketches.

Fountain parser adapted from [Fountain.js](https://github.com/mattdaly/Fountain.js).