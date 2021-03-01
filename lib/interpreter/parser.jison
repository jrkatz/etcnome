// Etcnome - A programmable metronome
// Copyright (C) 2020  Jacob Katz
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

/* description: Parses etcnome metronome config language 
 * (final name TBD) to an easy-to-read AST
 */
/* lexical grammar */
%lex
%{
  //put some symbols in for the lexer
  //these are our reserved words.
  const sym = new Map([
    ['BPM', 'BPM'],
    ['SWING', 'SWING'],
    ['OFF', 'OFF'],
    ['STRAIGHT', 'STRAIGHT'],
    ['EXACTLY', 'EXACTLY'],
    ['X', '*'],
    ['BEATS', 'BEATS'],
    ['H', 'HIGH' ],
    ['HI', 'HIGH' ],
    ['HIGH', 'HIGH'],
    ['M', 'MID'],
    ['MID', 'MID'],
    ['L', 'LOW'],
    ['LO', 'LOW'],
    ['LOW', 'LOW'],
    ['ACC', 'ADJUST_BPM'],
    ['RIT', 'ADJUST_BPM'],
  ]);

  const toSym = (text) => sym.has(text.toUpperCase()) ? sym.get(text.toUpperCase()) : 'IDENTIFIER';
  if (typeof yy.lmap === 'undefined') {
    yy.lmap = new Map();
  }
  yy.collect = (args) => {
    yy.lmap.set(
      args[0],
      args.slice(1).map((token) => yy.lmap.get(token))
        .reduce((left, right) => ({
            first_column: left.first_column,
            first_line: left.first_line,
            last_column: right.last_column,
            last_line: right.last_line,
          }))
        );
  };
  const log = (x) => { 
    const obj = JSON.parse(JSON.stringify(yylloc));
    //yylloc is not zero indexed for lines, but we want
    //zero indexed values.
    obj.first_line -= 1;
    obj.last_line -= 1;
    const s = Symbol(yytext);
    yytext = s;
    yy.lmap.set(yytext, obj);
    return x;
  };
%}

%%
[ \t]+                                    log();/* skip whitespace */
"//"[^\n]*                                return log('COMMENT');
"..."                                     return log('DOT_DOT_DOT');
([0-9]*".")?[0-9]+" "*[Bb][Pp][Mm]        return log('EXACT_REV_BPM');
([0-9]*".")?[0-9]+" "*"*"" "*[Bb][Pp][Mm] return log('REL_REV_BPM');
[0-9]*"."[0-9]+                           return log('DECIMAL_NUMBER');
[0-9]+                                    return log('WHOLE_NUMBER');
\b[Aa]" "[Tt][Ee][Mm][Pp][Oo]             return log('A_TEMPO');
\b[a-wyzA-WYZ][0-9a-zA-Z]*\b              return log(toSym(yytext));
\b[a-zA-Z]{2}[0-9a-zA-Z]*\b               return log(toSym(yytext));
"="                                       return log('=');
":"                                       return log(':');
"+"                                       return log('+');
"*"                                       return log('*');
"/"                                       return log('/');
"("                                       return log ('(');
")"                                       return log(')');
"//"                                      return log('COMMENT');
\n                                        return log('EOL');
<<EOF>>                                   return log('EOF');


/lex

%start track
%{
  //inject code here if needed
%}

%% /* language grammar */
/* require a bpm as the first instruction */
track
    : instructions EOF
      { return $1; }
    | instructions eol EOF
      { return $1; }
    | eol instructions EOF
      { return $2; }
    | eol instructions eol EOF
      { return $2; }
    ;

whole_number
    : WHOLE_NUMBER
      {
        $$ = Number($1.description);
        yy.collect([$$, $1]);
      }
    ;
decimal_number
    : DECIMAL_NUMBER
      {
        $$ = Number($1.description);
        yy.collect([$$, $1]);
      }
    ;

number
    : whole_number
    | decimal_number
    ;

/* an instruction that sets the bpm for subsequent instructions in the same scope */
bpm
    : BPM exact_or_rel_num
        { 
          $$ = ["bpm", $2]; 
          yy.collect([$$, $1, $2]);
        }
    | EXACT_REV_BPM
        {
          $$ = [ "bpm", ["exact", Number($1.description.split(/[ Bb]+/)[0]) ]];
          yy.collect([$$, $1]);
        }
    | REL_REV_BPM
        {
          $$ = [ "bpm", ["rel", Number($1.description.split(/[ Bb*]+/)[0]) ]];
          yy.collect([$$, $1]);
        }
    ;

adjust_bpm
    : ADJUST_BPM exact_or_rel_num number
        { 
          $$ = ["adjust_bpm", $2, $3];
          yy.collect([$$, $1, $2, $3]);
        }
    | ADJUST_BPM exact_or_rel_num number number
        {
          $$ = ["adjust_bpm", $2, $3, $4];
          yy.collect([$$, $1, $2, $3, $4]);
        }
;


a_tempo
    : A_TEMPO
        { 
          $$ = ["a_tempo"];
          yy.collect([$$, $1]);
        }
    ;

number_list
    : number 
        {
          $$ = [$1];
          yy.collect([$$, $1]);
        }
    | number_list number
        {
          $1.push($2);
          $$=$1;
          yy.collect([$$, $1, $2]);
	      }
    ;

swing
    : SWING number_list
        {
          $$ = ["swing", {ratios: $2}];
          yy.collect([$$, $1, $2]);
        }
    | SWING number_list DOT_DOT_DOT whole_number
        {
          $$ = ["swing", {ratios: $2, phrase: $4}];
          yy.collect([$$, $1, $2, $3, $4]);
        }
    | SWING OFF
        {
          $$ = ["swing", null];
          yy.collect([$$, $1, $2]);
        }
    | STRAIGHT
        {
          $$ = ["swing", null];
          yy.collect([$$, $1]);
        }
    ;

/* One newline, two newlines, three newlines, end of file... all the same to me. */
/* Pretend comments are newlines. */
eol
    : EOL
    | EOL eol
    | COMMENT
    | COMMENT eol
    ;

/* A list of instructions separated by eols */
instructions
    : instruction
        {
          $$ = [ "instrs", $1 ];
          yy.collect([$$, $1]);
        }
    | instructions eol instruction
        { 
          $1.push($3);
          $$ = $1;
          yy.collect([$$, $1, $2, $3]);
        }
    ;

assign
    : IDENTIFIER '=' section
        {
          $$ = ['assign', $1.description, $3]; 
          yy.collect([$$, $1, $2, $3]);
        }
    ;

play
    : EXACTLY IDENTIFIER
        {
          $$ = ['play', $2.description];
          yy.collect([$$, $1, $2]);
        }
    ;

reinterpret
    : IDENTIFIER
        {
          $$ = ['reinterpret', $1.description];
          yy.collect([$$, $1]);
        }
    ;

/* A single instruction either produces a section or sets the bpm for subsequent sections in the same scope */
instruction_noloc
    : bpm
    | adjust_bpm
    | a_tempo
    | swing
    | assign
    | section
    ;
instruction
    : instruction_noloc
        {
          $$ = [$1, yy.lmap.get($1)];
          yy.collect([$$, $1]);
        }
    ;

phrase_list
    : whole_number
        {
          $$ = [$1]; 
          yy.collect([$$, $1]);
        }
    | phrase_list '+' whole_number
        {
          $1.push($3);
          $$=$1;
          yy.collect([$$, $1, $2, $3]);
        }
    ;

polyrhythm_list
    : phrase_list
      { 
        $$ = [$1];
        yy.collect([$$, $1]);
      }
    | polyrhythm_list ':' phrase_list
        {
          $1.push($3);
          $$ = $1;
          yy.collect([$$, $1, $2, $3]);
        }
    ;

measure_denom
    : number
    ;

measure
    : polyrhythm_list '/' measure_denom
        {
          $$ = ["Measure", $1, $3]; 
          yy.collect([$$, $1, $2, $3]);
        }
    ;

/* The expressions in this section bother me. I'm sure I missed something in the manual;
returning the token value itself should be easy. And yet... */
intensity
    : HIGH
        {
          $$ = 'HIGH';
          yy.collect([$$, $1]);
        }
    | MID
        {
          $$ = 'MID';
          yy.collect([$$, $1]);
        }
    | LOW
        { 
          $$ = 'LOW';
          yy.collect([$$, $1]);
        }
    ;

exact_or_rel_num
    : '*' number
        {
          $$ = ['rel', $2]; 
          yy.collect([$$, $1, $2]);
        }
    | number
        {
          $$ = ['exact', $1];
          yy.collect([$$, $1]);
        }
    ;

beat
    : intensity exact_or_rel_num
        {
          $$ = [$1, $2];
          yy.collect([$$, $1, $2]);
        }
    ;

beat_list
    : beat
        {
          $$ = [$1];
          yy.collect([$$, $1]);
        }
    | beat_list beat
        { 
          $1.push($2);
          $$=$1;
          yy.collect([$$, $1, $2]);
        }
    ;

beats
   : BEATS beat_list
       {
         $$ = ['BeatList', $2]; 
         yy.collect([$$, $1, $2]);
       }
   ;

section_noloc
    : measure
    | beats
    | play
    | reinterpret
    | '(' instructions ')'
        {
          $$ = $2; 
          yy.collect([$$, $1, $2, $3]);
        }
    | '(' eol instructions ')'
        {
          $$ = $3; 
          yy.collect([$$, $1, $2, $3, $4]);
        }
    | '(' eol instructions eol ')'
        {
          $$ = $3;
          yy.collect([$$, $1, $2, $3, $4, $5]);
        }
    | section '*' whole_number
        { 
          $$ = ["RepeatingSection", $1, $3];
          yy.collect([$$, $1, $2, $3]);
        }
    ;
section
    : section_noloc
        {
          $$ = [$1, yy.lmap.get($1)];
          yy.collect([$$, $1]);
        }
    ;

