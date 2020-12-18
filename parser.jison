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

%%
[ \t]+                      /* skip whitespace */
"//"[^\n]*                  return 'COMMENT';
"..."                       return 'DOT_DOT_DOT';
[0-9]+"."[0-9]+             return 'DECIMAL_NUMBER';
[0-9]+                      return 'WHOLE_NUMBER';
\b[Bb][Pp][Mm]\b            return 'BPM';
\b[Ss][[Ww][Ii][Nn][Gg]\b   return 'SWING';
\b[Oo][Ff][Ff]\b            return 'OFF';
":"                         return ':';
"+"                         return '+';
"*"                         return '*';
"x"                         return '*';
"/"                         return '/'
"("                         return '(';
")"                         return ')';
"//"                        return 'COMMENT';
\n                          return 'EOL';
<<EOF>>                     return 'EOF';

/lex

%start track
%{
        let tmp = null;
%}

%% /* language grammar */
/* require a bpm as the first instruction */
track
    : init_bpm eol instructions
        {
        tmp = $3;
        tmp.splice(1, 0, $1);
        return tmp;
        }
    | init_bpm eol
        { return ["instrs", $1]; }
    | eol
        {
        //make empty files valid, if boring.
        return ["instrs"];
        }
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

/* allow newlines at the top of the file before the first bpm */
init_bpm
    : eol bpm
        { $$ = $2; }
    | bpm
    ;

/* an instruction that sets the bpm for subsequent instructions in the same scope */
bpm
    : BPM number
        { $$ = ["bpm", $2]; }
    ;

number_list
    : number 
        { $$ = [$1]; }
    | number number_list
        {
 		tmp = $2;
		tmp.splice(0, 0, $1);
		$$ = tmp;
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
    | EOF
    | EOL eol
    | COMMENT eol
    ;

/* A list of instructions separated by eols */
instructions
    : instruction eol
        { $$ = [ "instrs", $1 ]; }
    | instruction eol instructions
        { 
          tmp = $3;
          tmp.splice(1, 0, $1);
          $$ = tmp;
        }
    ;

/* A single instruction either produces a section or sets the bpm for subsequent sections in the same scope */
instruction
    : bpm
    | swing
    | section
    ;

phrase_list
    : whole_number
        { $$ = [$1]; }
    | whole_number '+' phrase_list
        {
          tmp = $3;
          tmp.splice(0,0,$1);
          $$ = tmp;
        }
    ;

polyrhythm_list
    : phrase_list
      { $$ = [$1]; }
    | phrase_list ':' polyrhythm_list
        {
          tmp = $3;
          tmp.splice(0,0,$1);
          $$ = tmp;
        }
    ;

measure_denom
    : number
    ;

measure
    : polyrhythm_list '/' measure_denom
        { $$ = ["Measure", $1, $3]; }
    ;

section
    : measure
    | '(' instructions ')'
        { $$ = $2; }
    | '(' eol instructions ')'
        { $$ = $3; }
    | section '*' whole_number
        { $$ = ["RepeatingSection", $1, $3]; }
    ;
