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
  sym = new Map([
    ['BPM', 'BPM'],
    ['SWING', 'SWING'],
    ['OFF', 'OFF'],
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
%}

%%
[ \t]+                        /* skip whitespace */
"//"[^\n]*                    return 'COMMENT';
"..."                         return 'DOT_DOT_DOT';
[0-9]+"."[0-9]+               return 'DECIMAL_NUMBER';
[0-9]+                        return 'WHOLE_NUMBER';
\b[Aa]" "[Tt][Ee][Mm][Pp][Oo] return 'A_TEMPO';
\b[a-wyzA-WYZ][0-9a-zA-Z]*\b  return sym.has(yytext.toUpperCase()) ? sym.get(yytext.toUpperCase()) : 'IDENTIFIER';
\b[a-zA-Z]{2}[0-9a-zA-Z]*\b   return sym.has(yytext.toUpperCase()) ? sym.get(yytext.toUpperCase()) : 'IDENTIFIER';
"="                           return '=';
":"                           return ':';
"+"                           return '+';
"*"                           return '*';
[xX]                          return '*';
"/"                           return '/'
"("                           return '(';
")"                           return ')';
"//"                          return 'COMMENT';
\n                            return 'EOL';
<<EOF>>                       return 'EOF';


/lex

%start track

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
      { $$ = Number($1); }
    ;
decimal_number
    : DECIMAL_NUMBER
      { $$ = Number($1); }
    ;

number
    : whole_number
    | decimal_number
    ;

/* an instruction that sets the bpm for subsequent instructions in the same scope */
bpm
    : BPM exact_or_rel_num
        { $$ = ["bpm", $2]; }
    ;

adjust_bpm
    : ADJUST_BPM exact_or_rel_num number
        { $$ = ["adjust_bpm", $2, $3] }
    | ADJUST_BPM exact_or_rel_num number number
        { $$ = ["adjust_bpm", $2, $3, $4] }
;


a_tempo
    : A_TEMPO
        { $$ = ["a_tempo"]; }
    ;

number_list
    : number 
        { $$ = [$1]; }
    | number_list number
        {
          $1.push($2);
          $$=$1
	      }
    ;

swing
    : SWING number_list
	{ $$ = ["swing", {ratios: $2}]; }
    | SWING number_list DOT_DOT_DOT whole_number
	{ $$ = ["swing", {ratios: $2, phrase: $4}]; }
    | SWING OFF
 	{ $$ = ["swing", null]; }
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
        { $$ = [ "instrs", $1 ]; }
    | instructions eol instruction
        { 
          $1.push($3);
          $$ = $1;
        }
    ;

assign
    : IDENTIFIER '=' section
        { $$ = ['assign', $1, $3]; }
    ;

play
    : EXACTLY IDENTIFIER
        { $$ = ['play', $2]; }
    ;

reinterpret
    : IDENTIFIER
        { $$ = ['reinterpret', $1] }
    ;

/* A single instruction either produces a section or sets the bpm for subsequent sections in the same scope */
instruction
    : bpm
    | adjust_bpm
    | a_tempo
    | swing
    | assign
    | section
    ;

phrase_list
    : whole_number
        { $$ = [$1]; }
    | phrase_list '+' whole_number
        {
          $1.push($3);
          $$=$1;
        }
    ;

polyrhythm_list
    : phrase_list
      { $$ = [$1]; }
    | polyrhythm_list ':' phrase_list
        {
          $1.push($3);
          $$ = $1;
        }
    ;

measure_denom
    : number
    ;

measure
    : polyrhythm_list '/' measure_denom
        { $$ = ["Measure", $1, $3]; }
    ;

/* The expressions in this section bother me. I'm sure I missed something in the manual;
returning the token value itself should be easy. And yet... */
intensity
    : HIGH
        { $$ = 'HIGH'; }
    | MID
        { $$ = 'MID'; }
    | LOW
        { $$ = 'LOW'; }
    ;

exact_or_rel_num
    : '*' number
        { $$ = ['rel', $2]; }
    | number
        { $$ = ['exact', $1]; }
    ;

beat
    : intensity exact_or_rel_num
        { $$ = [$1, $2]; }
    ;

beat_list
    : beat
        { $$ = [$1]; }
    | beat_list beat
        { 
          $1.push($2);
          $$=$1;
        }
    ;

beats
   : BEATS beat_list
       { $$ = ['BeatList', $2]; }
   ;

section
    : measure
    | beats
    | play
    | reinterpret
    | '(' instructions ')'
        { $$ = $2; }
    | '(' eol instructions ')'
        { $$ = $3; }
    | '(' eol instructions eol ')'
        { $$ = $3; }
    | section '*' whole_number
        { $$ = ["RepeatingSection", $1, $3]; }
    ;
