export enum Token {  
  Character = 'character',
  TitlePage = 'titlePage',
  SceneHeading = 'sceneHeading',
  SceneNumber = 'sceneNumber',
  Transition = 'transition',
  Dialogue = 'dialogue',
  Parenthetical = 'parenthetical',
  Action = 'action',
  Centered = 'centered',
  Section = 'section',
  Synopsis = 'synopsis',
  Note = 'note',
  NoteInline = 'noteInline',
  Boneyard = 'boneyard',
  PageBreak = 'pageBreak',
  LineBreak = 'lineBreak',
  Emphasis = 'emphasis',
  FX = 'fx',
  BoldItalicUnderline = 'boldItalicUnderline',
  BoldUnderline = 'boldUnderline',
  ItalicUnderline = 'italicUnderline',
  BoldItalic = 'boldItalic',
  Bold = 'bold',
  Italic = 'italic',
  Underline = 'underline',
  Splitter = 'splitter',
  Cleaner = 'cleaner',
  Standardizer = 'standardizer',
  Whitespacer = 'whitespacer',
}

export interface TokenData {
  type: Token | string;
  text: string;
}

const regexMap: {[token: string]: RegExp;} = {
  
    [Token.TitlePage]: /^((?:title|credit|author[s]?|format|source|notes|draft date|date|contact|copyright)\:)/gim,

    [Token.SceneHeading]: /^((?:\*{0,3}_?)?(?:(?:int|ext|est|i\/e)[. ]).+)|^(?:\.(?!\.+))(.+)/i,
    [Token.SceneHeading]: /( *#(.+)# *)/,

    [Token.Transition]: /^((?:FADE (?:TO BLACK|OUT)|CUT TO BLACK)\.|.+ TO\:)|^(?:> *)(.+)/,

    [Token.FX]: /^((F\/X|ATMOS). (.+))/,

    [Token.Dialogue]: /^([A-Z*_]+[0-9A-Z (._\-')]*)(\^?)?(?:\n(?!\n+))([\s\S]+)/,
    [Token.Parenthetical]: /^(\(.+\))$/,

    [Token.Action]: /^(.+)/g,
    [Token.Centered]: /^(?:> *)(.+)(?: *<)(\n.+)*/g,

    [Token.Section]: /^(#+)(?: *)(.*)/,
    [Token.Synopsis]: /^(?:\=(?!\=+) *)(.*)/,

    [Token.Note]: /^(?:\[{2}(?!\[+))(.+)(?:\]{2}(?!\[+))$/,
    [Token.NoteInline]: /(?:\[{2}(?!\[+))([\s\S]+?)(?:\]{2}(?!\[+))/g,
    [Token.Boneyard]: /(^\/\*|^\*\/)$/g,

    [Token.PageBreak]: /^\={3,}$/,
    [Token.LineBreak]: /^ {2}$/,

    [Token.Emphasis]: /(_|\*{1,3}|_\*{1,3}|\*{1,3}_)(.+)(_|\*{1,3}|_\*{1,3}|\*{1,3}_)/g,
    [Token.BoldItalicUnderline]: /(_{1}\*{3}(?=.+\*{3}_{1})|\*{3}_{1}(?=.+_{1}\*{3}))(.+?)(\*{3}_{1}|_{1}\*{3})/g,
    [Token.BoldUnderline]: /(_{1}\*{2}(?=.+\*{2}_{1})|\*{2}_{1}(?=.+_{1}\*{2}))(.+?)(\*{2}_{1}|_{1}\*{2})/g,
    [Token.ItalicUnderline]: /(?:_{1}\*{1}(?=.+\*{1}_{1})|\*{1}_{1}(?=.+_{1}\*{1}))(.+?)(\*{1}_{1}|_{1}\*{1})/g,
    [Token.BoldItalic]: /(\*{3}(?=.+\*{3}))(.+?)(\*{3})/g,
    [Token.Bold]: /(\*{2}(?=.+\*{2}))(.+?)(\*{2})/g,
    [Token.Italic]: /(\*{1}(?=.+\*{1}))(.+?)(\*{1})/g,
    [Token.Underline]: /(_{1}(?=.+_{1}))(.+?)(_{1})/g,

    [Token.Splitter]: /\n{2,}/g,
    [Token.Cleaner]: /^\n+|\n+$/,
    [Token.Standardizer]: /\r\n|\r/g,
    [Token.Whitespacer]: /^\t+|^ {3,}/gm
  };

  function lexer(script: string) {
    return script.replace(regexMap.boneyard, '\n$1\n')
      .replace(regexMap.standardizer, '\n')
      .replace(regexMap[Token.Cleaner], '')
      .replace(regexMap.whitespacer, '');
  };

  function tokenize(script: string): { tokens: any, metadata: any} {
    var src = lexer(script).split(regexMap.splitter)
      , i = src.length, line, match, parts, text, meta, x, xlen, dual
      , tokens = [];

    const metadata: {
      [key: string]: string;
    } = {};

    while (i--) {
      line = src[i];

      // title page
      if (regexMap[Token.TitlePage].test(line)) {
        match = line.replace(regexMap[Token.TitlePage], '\n$1').split(regexMap.splitter).reverse();
        for (x = 0, xlen = match.length; x < xlen; x++) {
          parts = match[x].replace(regexMap.cleaner, '').split(/\:\n*/);
          const key = parts[0].trim().toLowerCase().replace(' ', '_');
          if (key) {
            metadata[key] = parts[1].trim();
          }
        }
        continue;
      }

      // scene headings
      if (match = line.match(regexMap[Token.SceneHeading])) {
        text = match[1] || match[2];

        if (text.indexOf('  ') !== text.length - 2) {
          if (meta = text.match(regexMap.scene_number)) {
            meta = meta[2];
            text = text.replace(regexMap.scene_number, '');
          }
          tokens.push({ type: 'scene_heading', text: text, scene_number: meta || undefined });
        }
        continue;
      }

      // centered
      if (match = line.match(regexMap.centered)) {
        tokens.push({ type: 'centered', text: match[0].replace(/>|</g, '') });
        continue;
      }

      // transitions
      if (match = line.match(regexMap.transition)) {
        tokens.push({ type: 'transition', text: match[1] || match[2] });
        continue;
      }

      // dialogue blocks - characters, parentheticals and dialogue
      if (match = line.match(regexMap.dialogue)) {
        if (match[1].indexOf('  ') !== match[1].length - 2) {
          // we're iterating from the bottom up, so we need to push these backwards
          if (match[2]) {
            tokens.push({ type: 'dual_dialogue_end' });
          }

          tokens.push({ type: 'dialogue_end' });

          parts = match[3].split(/(\(.+\))(?:\n+)/).reverse();

          for (x = 0, xlen = parts.length; x < xlen; x++) {
            text = parts[x];

            if (text.length > 0) {
              tokens.push({ type: regexMap.parenthetical.test(text) ? 'parenthetical' : 'dialogue', text: text });
            }
          }

          tokens.push({ type: 'character', text: match[1].trim() });
          tokens.push({ type: 'dialogue_begin', dual: match[2] ? 'right' : dual ? 'left' : undefined });

          if (dual) {
            tokens.push({ type: 'dual_dialogue_begin' });
          }

          dual = match[2] ? true : false;
          continue;
        }
      }

      // section
      if (match = line.match(regexMap.section)) {
        tokens.push({ type: Token.Section, text: match[2], depth: match[1].length });
        continue;
      }
      
      // fx
      if (match = line.match(regexMap[Token.FX])) {
        tokens.push({ type: Token.FX, style: match[2], text: match[3] });
        continue;
      }

      // synopsis
      if (match = line.match(regexMap.synopsis)) {
        tokens.push({ type: Token.Synopsis, text: match[1] });
        continue;
      }

      // notes
      if (match = line.match(regexMap.note)) {
        tokens.push({ type: Token.Note, text: match[1] });
        continue;
      }

      // boneyard
      if (match = line.match(regexMap.boneyard)) {
        tokens.push({ type: match[0][0] === '/' ? 'boneyard_begin' : 'boneyard_end' });
        continue;
      }

      // page breaks
      if (regexMap[Token.PageBreak].test(line)) {
        tokens.push({ type: Token.PageBreak });
        continue;
      }

      // line breaks
      if (regexMap[Token.LineBreak].test(line)) {
        tokens.push({ type: Token.LineBreak });
        continue;
      }

      tokens.push({ type: Token.Action, text: line });
    }

    return { tokens: tokens.reverse(), metadata };
  };

function parse(script: string): { tokens: TokenData[], metadata: { title: string, credit: string, authors: string } } {
    return tokenize(script);
  };

export { parse }